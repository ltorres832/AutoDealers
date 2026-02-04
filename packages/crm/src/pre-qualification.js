"use strict";
// Sistema de Pre-Cualificación para Financiamiento
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPreQualification = createPreQualification;
exports.getPreQualificationById = getPreQualificationById;
exports.getPreQualifications = getPreQualifications;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const leads_1 = require("./leads");
const inventory_1 = require("@autodealers/inventory");
const core_2 = require("@autodealers/core");
const core_3 = require("@autodealers/core");
const db = (0, core_1.getFirestore)();
/**
 * Crea una nueva pre-cualificación
 */
async function createPreQualification(tenantId, data) {
    // Evaluar la pre-cualificación
    const evaluation = evaluatePreQualification(data);
    // Obtener vehículos sugeridos
    const suggestedVehicles = await getSuggestedVehicles(tenantId, evaluation.approvedAmount || data.preferences.desiredPriceRange.min, data.preferences.vehicleType);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Válida por 30 días
    const preQualData = {
        ...data,
        result: {
            ...evaluation,
            suggestedVehicles: suggestedVehicles.map(v => v.id),
        },
        expiresAt,
        createdAt: new Date(),
    };
    const docRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pre_qualifications')
        .doc();
    await docRef.set({
        ...preQualData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        'contact.dateOfBirth': admin.firestore.Timestamp.fromDate(data.contact.dateOfBirth),
        'expiresAt': admin.firestore.Timestamp.fromDate(expiresAt),
    });
    const preQualification = {
        id: docRef.id,
        ...preQualData,
    };
    // Crear lead automáticamente si está pre-aprobado o parcialmente aprobado
    if (evaluation.status === 'pre_approved' || evaluation.status === 'partially_approved') {
        const lead = await (0, leads_1.createLead)(tenantId, 'web', {
            name: data.contact.name,
            email: data.contact.email,
            phone: data.contact.phone,
            preferredChannel: 'email',
        }, `Pre-cualificación ${evaluation.status === 'pre_approved' ? 'Pre-Aprobada' : 'Parcialmente Aprobada'}. Score: ${evaluation.score}/100. Monto aprobado: $${evaluation.approvedAmount?.toLocaleString() || 'N/A'}. Razones: ${evaluation.reasons.join(', ')}`);
        // Actualizar el lead con información adicional
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc(lead.id)
            .update({
            status: 'pre_qualified',
            interestedVehicles: suggestedVehicles.map(v => v.id),
            notes: `${lead.notes}\n\nInformación de Pre-Cualificación:\n- Score: ${evaluation.score}/100\n- Monto Aprobado: $${evaluation.approvedAmount?.toLocaleString() || 'N/A'}\n- Tasa Estimada: ${evaluation.interestRate?.toFixed(2) || 'N/A'}%\n- Plazo: ${data.preferences.financingTerm} meses\n- Historial Crediticio: ${data.financial.creditHistory}\n- Ingresos Mensuales: $${data.financial.monthlyIncome.toLocaleString()}\n- Gastos Mensuales: $${data.financial.monthlyExpenses.toLocaleString()}`,
        });
        // Actualizar pre-cualificación con leadId
        await docRef.update({
            leadId: lead.id,
        });
        preQualification.leadId = lead.id;
        // Asignar lead a un vendedor disponible
        await assignToAvailableSeller(tenantId, lead.id);
        // Enviar notificaciones
        await sendPreQualificationNotifications(tenantId, lead.id, preQualification);
    }
    return preQualification;
}
/**
 * Evalúa una pre-cualificación y retorna el resultado
 */
function evaluatePreQualification(data) {
    let score = 0;
    const reasons = [];
    // 1. Ratio de Deuda (40 puntos)
    const debtRatio = data.financial.monthlyExpenses / data.financial.monthlyIncome;
    if (debtRatio < 0.3) {
        score += 40;
        reasons.push('Excelente capacidad de pago');
    }
    else if (debtRatio < 0.5) {
        score += 30;
        reasons.push('Buena capacidad de pago');
    }
    else if (debtRatio < 0.7) {
        score += 20;
        reasons.push('Capacidad de pago aceptable');
    }
    else {
        reasons.push('Ratio de deuda alto');
    }
    // 2. Historial Crediticio (30 puntos)
    const creditScoreMap = {
        'excellent': 30,
        'good': 25,
        'fair': 15,
        'limited': 5,
        'poor': 0,
    };
    score += creditScoreMap[data.financial.creditHistory];
    reasons.push(`Historial crediticio: ${data.financial.creditHistory}`);
    // 3. Estabilidad Laboral (20 puntos)
    if (data.financial.employmentDuration >= 24) {
        score += 20;
        reasons.push('Excelente estabilidad laboral');
    }
    else if (data.financial.employmentDuration >= 12) {
        score += 15;
        reasons.push('Buena estabilidad laboral');
    }
    else if (data.financial.employmentDuration >= 6) {
        score += 10;
        reasons.push('Estabilidad laboral aceptable');
    }
    else {
        reasons.push('Poca estabilidad laboral');
    }
    // 4. Tipo de Empleo (10 puntos)
    if (data.financial.employmentType === 'employed') {
        score += 10;
    }
    else if (data.financial.employmentType === 'self_employed') {
        score += 5;
    }
    else if (data.financial.employmentType === 'retired') {
        score += 8;
    }
    // Calcular monto máximo de pago mensual (30% de ingresos disponibles)
    const availableIncome = data.financial.monthlyIncome - data.financial.monthlyExpenses;
    const maxMonthlyPayment = availableIncome * 0.3;
    // Calcular monto máximo del préstamo basado en el pago mensual
    const interestRate = calculateInterestRate(score, data.financial.creditHistory);
    const monthlyRate = interestRate / 100 / 12;
    const termMonths = data.preferences.financingTerm;
    let approvedAmount = 0;
    if (monthlyRate > 0) {
        approvedAmount = maxMonthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate);
    }
    else {
        approvedAmount = maxMonthlyPayment * termMonths;
    }
    // Ajustar según el monto solicitado
    const requestedMin = data.preferences.desiredPriceRange.min;
    const requestedMax = data.preferences.desiredPriceRange.max;
    if (approvedAmount > requestedMax) {
        approvedAmount = requestedMax;
    }
    // Determinar estado
    let status;
    if (score >= 70 && approvedAmount >= requestedMin * 0.8) {
        status = 'pre_approved';
    }
    else if (score >= 50 && approvedAmount >= requestedMin * 0.5) {
        status = 'partially_approved';
    }
    else if (score >= 30) {
        status = 'manual_review';
    }
    else {
        status = 'not_qualified';
    }
    return {
        status,
        score,
        approvedAmount: status !== 'not_qualified' ? Math.round(approvedAmount) : undefined,
        maxAmount: Math.round(approvedAmount),
        interestRate,
        reasons,
    };
}
/**
 * Calcula la tasa de interés estimada
 */
function calculateInterestRate(score, creditHistory) {
    let baseRate = 8.0; // Tasa base 8%
    // Ajustar según score
    if (score >= 80) {
        baseRate -= 2.0;
    }
    else if (score >= 70) {
        baseRate -= 1.0;
    }
    else if (score >= 60) {
        baseRate += 0.5;
    }
    else if (score >= 50) {
        baseRate += 1.5;
    }
    else {
        baseRate += 3.0;
    }
    // Ajustar según historial crediticio
    const creditAdjustment = {
        'excellent': -1.5,
        'good': -0.5,
        'fair': 1.0,
        'limited': 2.5,
        'poor': 4.0,
    };
    baseRate += creditAdjustment[creditHistory];
    return Math.max(5.0, Math.min(18.0, baseRate)); // Entre 5% y 18%
}
/**
 * Obtiene vehículos sugeridos según el monto aprobado
 */
async function getSuggestedVehicles(tenantId, maxPrice, vehicleType) {
    try {
        const vehicles = await (0, inventory_1.getVehicles)(tenantId, {
            status: 'available',
            maxPrice: maxPrice,
        });
        // Filtrar por tipo si es necesario
        let filtered = vehicles;
        if (vehicleType !== 'both') {
            filtered = vehicles.filter(v => {
                const condition = v.condition?.toLowerCase() || 'used';
                return vehicleType === 'new' ? condition === 'new' : condition !== 'new';
            });
        }
        // Ordenar por precio (más cercano al monto aprobado primero)
        filtered.sort((a, b) => {
            const diffA = Math.abs(a.price - maxPrice);
            const diffB = Math.abs(b.price - maxPrice);
            return diffA - diffB;
        });
        return filtered.slice(0, 6); // Máximo 6 vehículos sugeridos
    }
    catch (error) {
        console.error('Error getting suggested vehicles:', error);
        return [];
    }
}
/**
 * Asigna el lead a un vendedor disponible
 */
async function assignToAvailableSeller(tenantId, leadId) {
    try {
        const users = await (0, core_3.getUsersByTenant)(tenantId);
        const sellers = users.filter(u => u.role === 'seller' && u.status === 'active');
        if (sellers.length === 0) {
            return; // No hay vendedores disponibles
        }
        // Obtener leads asignados por vendedor para balancear carga
        const assignmentCounts = {};
        for (const seller of sellers) {
            const leads = await db
                .collection('tenants')
                .doc(tenantId)
                .collection('leads')
                .where('assignedTo', '==', seller.id)
                .where('status', 'in', ['new', 'pre_qualified', 'contacted', 'qualified'])
                .get();
            assignmentCounts[seller.id] = leads.size;
        }
        // Asignar al vendedor con menos leads
        const sortedSellers = sellers.sort((a, b) => {
            const countA = assignmentCounts[a.id] || 0;
            const countB = assignmentCounts[b.id] || 0;
            return countA - countB;
        });
        await (0, leads_1.assignLead)(tenantId, leadId, sortedSellers[0].id);
    }
    catch (error) {
        console.error('Error assigning to seller:', error);
    }
}
/**
 * Envía notificaciones sobre la pre-cualificación
 */
async function sendPreQualificationNotifications(tenantId, leadId, preQualification) {
    try {
        // Obtener el lead para saber a quién está asignado
        const leadDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc(leadId)
            .get();
        if (!leadDoc.exists) {
            return;
        }
        const leadData = leadDoc.data();
        const assignedTo = leadData?.assignedTo;
        // Notificar al vendedor asignado
        if (assignedTo) {
            const statusText = preQualification.result.status === 'pre_approved'
                ? 'Pre-Aprobado'
                : 'Parcialmente Pre-Aprobado';
            await (0, core_2.createNotification)({
                tenantId,
                userId: assignedTo,
                type: 'lead_created',
                title: `Nueva Pre-Cualificación ${statusText}`,
                message: `${preQualification.contact.name} ha sido pre-cualificado con un score de ${preQualification.result.score}/100. Monto aprobado: $${preQualification.result.approvedAmount?.toLocaleString() || 'N/A'}`,
                channels: ['system', 'email'],
                metadata: {
                    leadId,
                    preQualificationId: preQualification.id,
                    score: preQualification.result.score,
                    approvedAmount: preQualification.result.approvedAmount,
                },
            });
        }
        // Notificar al dealer (si el tenant es un dealer)
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();
        if (tenantData?.type === 'dealer') {
            // Obtener usuarios dealer
            const dealerUsers = await (0, core_3.getUsersByTenant)(tenantId);
            const dealers = dealerUsers.filter(u => u.role === 'dealer' && u.status === 'active');
            for (const dealer of dealers) {
                await (0, core_2.createNotification)({
                    tenantId,
                    userId: dealer.id,
                    type: 'lead_created',
                    title: `Nueva Pre-Cualificación en tu Concesionario`,
                    message: `${preQualification.contact.name} ha sido pre-cualificado. Score: ${preQualification.result.score}/100. Monto: $${preQualification.result.approvedAmount?.toLocaleString() || 'N/A'}`,
                    channels: ['system', 'email'],
                    metadata: {
                        leadId,
                        preQualificationId: preQualification.id,
                        score: preQualification.result.score,
                        approvedAmount: preQualification.result.approvedAmount,
                    },
                });
            }
        }
    }
    catch (error) {
        console.error('Error sending pre-qualification notifications:', error);
    }
}
/**
 * Obtiene una pre-cualificación por ID
 */
async function getPreQualificationById(tenantId, preQualificationId) {
    const doc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('pre_qualifications')
        .doc(preQualificationId)
        .get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        contact: {
            ...(data?.contact || {}),
            dateOfBirth: data?.contact?.dateOfBirth?.toDate?.() || new Date(),
        },
        createdAt: data?.createdAt?.toDate() || new Date(),
        expiresAt: data?.expiresAt?.toDate() || new Date(),
    };
}
/**
 * Obtiene pre-cualificaciones por tenant
 */
async function getPreQualifications(tenantId, filters) {
    try {
        let query = db
            .collection('tenants')
            .doc(tenantId)
            .collection('pre_qualifications');
        if (filters?.status) {
            query = query.where('result.status', '==', filters.status);
        }
        query = query.orderBy('createdAt', 'desc');
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }
        const snapshot = await query.get();
        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                contact: {
                    ...data.contact,
                    dateOfBirth: data.contact.dateOfBirth?.toDate() || new Date(),
                },
                createdAt: data?.createdAt?.toDate() || new Date(),
                expiresAt: data?.expiresAt?.toDate() || new Date(),
            };
        });
    }
    catch (error) {
        // Si falta un índice compuesto, intentar sin orderBy
        if (error.code === 9 || error.message?.includes('index')) {
            console.warn('⚠️ Índice faltante en Firestore para pre-qualifications. Obteniendo sin orderBy...');
            try {
                let query = db
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('pre_qualifications');
                if (filters?.status) {
                    query = query.where('result.status', '==', filters.status);
                }
                // Sin orderBy para evitar el error de índice faltante
                const snapshot = await query.get();
                let results = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        contact: {
                            ...data.contact,
                            dateOfBirth: data.contact.dateOfBirth?.toDate() || new Date(),
                        },
                        createdAt: data?.createdAt?.toDate() || new Date(),
                        expiresAt: data?.expiresAt?.toDate() || new Date(),
                    };
                });
                // Ordenar manualmente por createdAt
                results.sort((a, b) => {
                    const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                    const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                    return bDate - aDate; // Descendente
                });
                // Aplicar límite manualmente si es necesario
                if (filters?.limit) {
                    results = results.slice(0, filters.limit);
                }
                return results;
            }
            catch (fallbackError) {
                console.error('Error en fallback de getPreQualifications:', fallbackError);
                throw fallbackError;
            }
        }
        throw error;
    }
}
//# sourceMappingURL=pre-qualification.js.map
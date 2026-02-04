"use strict";
// Módulo F&I (Finance & Insurance)
// Gestión completa de solicitudes F&I, clientes, historial y trazabilidad
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
exports.createFIClient = createFIClient;
exports.getFIClientById = getFIClientById;
exports.getFIClients = getFIClients;
exports.updateFIClient = updateFIClient;
exports.createFIRequest = createFIRequest;
exports.submitFIRequest = submitFIRequest;
exports.updateFIRequestStatus = updateFIRequestStatus;
exports.addFIRequestNote = addFIRequestNote;
exports.getFIRequestById = getFIRequestById;
exports.getFIRequests = getFIRequests;
exports.getFIRequestHistory = getFIRequestHistory;
exports.calculateFinancing = calculateFinancing;
exports.calculateApprovalScore = calculateApprovalScore;
exports.createDocumentRequest = createDocumentRequest;
exports.getDocumentRequestByToken = getDocumentRequestByToken;
exports.submitDocumentToRequest = submitDocumentToRequest;
exports.getDocumentRequestsByFIRequest = getDocumentRequestsByFIRequest;
exports.calculateAndUpdateFinancing = calculateAndUpdateFinancing;
exports.calculateAndUpdateApprovalScore = calculateAndUpdateApprovalScore;
exports.addCosignerToRequest = addCosignerToRequest;
exports.calculateCombinedScore = calculateCombinedScore;
exports.updateCosignerStatus = updateCosignerStatus;
exports.getFIMetrics = getFIMetrics;
exports.createFIWorkflow = createFIWorkflow;
exports.getFIWorkflows = getFIWorkflows;
exports.executeFIWorkflows = executeFIWorkflows;
exports.compareFinancingOptions = compareFinancingOptions;
exports.validateDocument = validateDocument;
exports.pullCreditReport = pullCreditReport;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
// ============================================
// FUNCIONES DE CLIENTES F&I
// ============================================
/**
 * Crea un nuevo cliente F&I
 */
async function createFIClient(tenantId, clientData, createdBy) {
    const clientRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_clients')
        .doc();
    const client = {
        ...clientData,
        tenantId,
        createdBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await clientRef.set(client);
    return {
        id: clientRef.id,
        ...client,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene un cliente F&I por ID
 */
async function getFIClientById(tenantId, clientId) {
    const clientDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_clients')
        .doc(clientId)
        .get();
    if (!clientDoc.exists) {
        return null;
    }
    const data = clientDoc.data();
    return {
        id: clientDoc.id,
        ...data,
        createdAt: (data?.createdAt?.toDate() || new Date()),
        updatedAt: (data?.updatedAt?.toDate() || new Date()),
    };
}
/**
 * Obtiene todos los clientes F&I de un tenant
 */
async function getFIClients(tenantId) {
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_clients')
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data?.createdAt?.toDate() || new Date()),
            updatedAt: (data?.updatedAt?.toDate() || new Date()),
        };
    });
}
/**
 * Actualiza un cliente F&I
 */
async function updateFIClient(tenantId, clientId, updates) {
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_clients')
        .doc(clientId)
        .update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
// ============================================
// FUNCIONES DE SOLICITUDES F&I
// ============================================
/**
 * Crea una nueva solicitud F&I
 */
async function createFIRequest(tenantId, requestData, createdBy) {
    const requestRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .doc();
    const initialHistory = {
        id: db.collection('_').doc().id,
        action: 'created',
        performedBy: createdBy,
        timestamp: new Date(),
        notes: 'Solicitud F&I creada',
    };
    const request = {
        ...requestData,
        tenantId,
        status: 'draft',
        history: [initialHistory],
        createdBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await requestRef.set(request);
    return {
        id: requestRef.id,
        ...request,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Envía una solicitud F&I al gerente F&I
 */
async function submitFIRequest(tenantId, requestId, submittedBy, sellerNotes) {
    const requestRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
        throw new Error('Solicitud F&I no encontrada');
    }
    const currentData = requestDoc.data();
    const currentHistory = currentData.history || [];
    const historyEntry = {
        id: db.collection('_').doc().id,
        action: 'submitted',
        performedBy: submittedBy,
        timestamp: new Date(),
        previousStatus: currentData.status,
        newStatus: 'submitted',
        notes: sellerNotes || 'Solicitud enviada a F&I',
    };
    await requestRef.update({
        status: 'submitted',
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        submittedBy,
        sellerNotes: sellerNotes || currentData.sellerNotes,
        history: [...currentHistory, historyEntry],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Ejecutar workflows automáticos
    try {
        await executeFIWorkflows(tenantId, {
            ...currentData,
            id: requestId,
            status: 'submitted',
            submittedAt: new Date(),
            submittedBy,
        });
    }
    catch (error) {
        console.error('Error ejecutando workflows:', error);
    }
    // La notificación se maneja desde la API route que llama a esta función
}
/**
 * Actualiza el estado de una solicitud F&I (solo gerente F&I)
 */
async function updateFIRequestStatus(tenantId, requestId, newStatus, reviewedBy, fiManagerNotes, internalNotes) {
    const requestRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
        throw new Error('Solicitud F&I no encontrada');
    }
    const currentData = requestDoc.data();
    const currentHistory = currentData.history || [];
    const previousStatus = currentData.status;
    const historyEntry = {
        id: db.collection('_').doc().id,
        action: 'status_changed',
        performedBy: reviewedBy,
        timestamp: new Date(),
        previousStatus,
        newStatus,
        notes: fiManagerNotes || `Estado cambiado a ${newStatus}`,
    };
    const updateData = {
        status: newStatus,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        reviewedBy,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        history: [...currentHistory, historyEntry],
    };
    if (fiManagerNotes) {
        updateData.fiManagerNotes = fiManagerNotes;
    }
    if (internalNotes) {
        updateData.internalNotes = internalNotes;
    }
    await requestRef.update(updateData);
    // Enviar notificación al vendedor que creó la solicitud
    if (currentData.createdBy && previousStatus !== newStatus) {
        try {
            // Obtener información del cliente para el mensaje
            const clientDoc = await db
                .collection('tenants')
                .doc(tenantId)
                .collection('fi_clients')
                .doc(currentData.clientId)
                .get();
            const clientName = clientDoc.exists ? clientDoc.data()?.name || 'Cliente' : 'Cliente';
            // Mapear estados a mensajes amigables
            const statusMessages = {
                draft: { title: 'Solicitud F&I en Borrador', message: 'Tu solicitud F&I está en borrador' },
                submitted: { title: 'Solicitud F&I Enviada', message: 'Tu solicitud F&I ha sido enviada para revisión' },
                under_review: { title: 'Solicitud F&I en Revisión', message: 'Tu solicitud F&I está siendo revisada' },
                pre_approved: { title: '¡Solicitud F&I Pre-Aprobada!', message: `¡Excelente noticia! La solicitud F&I para ${clientName} ha sido pre-aprobada` },
                approved: { title: '¡Solicitud F&I Aprobada!', message: `¡Felicidades! La solicitud F&I para ${clientName} ha sido aprobada` },
                pending_info: { title: 'Información Pendiente - Solicitud F&I', message: `La solicitud F&I para ${clientName} necesita información adicional. Por favor revisa las notas del gerente F&I` },
                rejected: { title: 'Solicitud F&I Rechazada', message: `La solicitud F&I para ${clientName} ha sido rechazada. Por favor revisa las notas del gerente F&I para más detalles` },
            };
            const statusInfo = statusMessages[newStatus] || {
                title: 'Estado de Solicitud F&I Actualizado',
                message: `El estado de la solicitud F&I para ${clientName} ha cambiado a: ${newStatus}`,
            };
            // Importar createNotification dinámicamente para evitar dependencias circulares
            const { createNotification } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
            await createNotification({
                tenantId,
                userId: currentData.createdBy,
                type: 'system_alert',
                title: statusInfo.title,
                message: fiManagerNotes
                    ? `${statusInfo.message}\n\nNotas del Gerente F&I: ${fiManagerNotes}`
                    : statusInfo.message,
                channels: ['system', 'email'],
                metadata: {
                    requestId,
                    clientId: currentData.clientId,
                    previousStatus,
                    newStatus,
                    action: 'fi_request_status_changed',
                },
            });
            console.log(`✅ Notificación enviada al vendedor ${currentData.createdBy} sobre cambio de estado F&I: ${previousStatus} → ${newStatus}`);
        }
        catch (notificationError) {
            // No fallar si la notificación falla, solo loguear
            console.error('Error enviando notificación F&I al vendedor:', notificationError);
        }
    }
}
/**
 * Agrega una nota a una solicitud F&I
 */
async function addFIRequestNote(tenantId, requestId, note, addedBy, isInternal = false) {
    const requestRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
        throw new Error('Solicitud F&I no encontrada');
    }
    const currentData = requestDoc.data();
    const currentHistory = currentData.history || [];
    const historyEntry = {
        id: db.collection('_').doc().id,
        action: 'note_added',
        performedBy: addedBy,
        timestamp: new Date(),
        notes: note,
        metadata: { isInternal },
    };
    const updateData = {
        history: [...currentHistory, historyEntry],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (isInternal) {
        updateData.internalNotes = (currentData.internalNotes || '') + `\n[${new Date().toLocaleString()}] ${note}`;
    }
    else {
        updateData.fiManagerNotes = (currentData.fiManagerNotes || '') + `\n[${new Date().toLocaleString()}] ${note}`;
    }
    await requestRef.update(updateData);
}
/**
 * Obtiene una solicitud F&I por ID
 */
async function getFIRequestById(tenantId, requestId) {
    const requestDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .doc(requestId)
        .get();
    if (!requestDoc.exists) {
        return null;
    }
    const data = requestDoc.data();
    return {
        id: requestDoc.id,
        ...data,
        history: (data?.history || []).map((h) => ({
            ...h,
            timestamp: h.timestamp?.toDate() || new Date(),
        })),
        createdAt: (data?.createdAt?.toDate() || new Date()),
        updatedAt: (data?.updatedAt?.toDate() || new Date()),
        submittedAt: data?.submittedAt?.toDate() || undefined,
        reviewedAt: data?.reviewedAt?.toDate() || undefined,
    };
}
/**
 * Obtiene todas las solicitudes F&I de un tenant
 */
async function getFIRequests(tenantId, filters) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .orderBy('createdAt', 'desc');
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    if (filters?.clientId) {
        query = query.where('clientId', '==', filters.clientId);
    }
    if (filters?.createdBy) {
        query = query.where('createdBy', '==', filters.createdBy);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            history: (data?.history || []).map((h) => ({
                ...h,
                timestamp: h.timestamp?.toDate() || new Date(),
            })),
            createdAt: (data?.createdAt?.toDate() || new Date()),
            updatedAt: (data?.updatedAt?.toDate() || new Date()),
            submittedAt: data?.submittedAt?.toDate() || undefined,
            reviewedAt: data?.reviewedAt?.toDate() || undefined,
        };
    });
}
/**
 * Obtiene el historial completo de una solicitud F&I
 */
async function getFIRequestHistory(tenantId, requestId) {
    const request = await getFIRequestById(tenantId, requestId);
    return request?.history || [];
}
/**
 * Calcula el pago mensual y detalles de financiamiento
 */
function calculateFinancing(calc) {
    const taxRate = calc.taxRate || 0;
    const fees = calc.fees || 0;
    const tradeInValue = calc.tradeInValue || 0;
    // Calcular monto principal (precio - pronto pago - trade-in + tax + fees)
    const subtotal = calc.vehiclePrice - calc.downPayment - tradeInValue;
    const tax = subtotal * (taxRate / 100);
    const principalAmount = subtotal + tax + fees;
    // Convertir APR anual a tasa mensual
    const monthlyRate = (calc.interestRate / 100) / 12;
    // Calcular pago mensual usando fórmula de amortización
    let monthlyPayment;
    if (monthlyRate === 0) {
        monthlyPayment = principalAmount / calc.loanTerm;
    }
    else {
        monthlyPayment = principalAmount *
            (monthlyRate * Math.pow(1 + monthlyRate, calc.loanTerm)) /
            (Math.pow(1 + monthlyRate, calc.loanTerm) - 1);
    }
    const totalAmount = monthlyPayment * calc.loanTerm;
    const totalInterest = totalAmount - principalAmount;
    // Calcular DTI ratio si hay ingreso mensual
    let dtiRatio;
    let affordability = 'affordable';
    if (calc.monthlyIncome) {
        dtiRatio = (monthlyPayment / calc.monthlyIncome) * 100;
        if (dtiRatio > 40) {
            affordability = 'unaffordable';
        }
        else if (dtiRatio > 30) {
            affordability = 'tight';
        }
    }
    return {
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        principalAmount: Math.round(principalAmount * 100) / 100,
        dtiRatio,
        affordability,
        breakdown: {
            principal: Math.round(subtotal * 100) / 100,
            interest: Math.round(totalInterest * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            fees: Math.round(fees * 100) / 100,
        },
    };
}
/**
 * Calcula el score de aprobación basado en múltiples factores
 */
function calculateApprovalScore(request, vehiclePrice, downPayment, monthlyPayment) {
    let score = 0;
    const reasons = [];
    const riskFactors = [];
    const positiveFactors = [];
    // Factor 1: Rango de crédito (0-30 puntos)
    const creditScoreMap = {
        excellent: 30,
        good: 25,
        fair: 18,
        poor: 10,
        very_poor: 5,
    };
    const creditScore = creditScoreMap[request.creditInfo.creditRange] || 0;
    score += creditScore;
    if (request.creditInfo.creditRange === 'excellent' || request.creditInfo.creditRange === 'good') {
        positiveFactors.push('Excelente o buen historial crediticio');
    }
    else if (request.creditInfo.creditRange === 'very_poor' || request.creditInfo.creditRange === 'poor') {
        riskFactors.push('Historial crediticio bajo');
    }
    // Factor 2: Relación deuda/ingreso (0-25 puntos)
    const monthlyIncome = request.employment.monthlyIncome;
    if (monthlyIncome > 0) {
        const dtiRatio = (monthlyPayment / monthlyIncome) * 100;
        if (dtiRatio <= 20) {
            score += 25;
            positiveFactors.push('DTI ratio excelente (≤20%)');
        }
        else if (dtiRatio <= 30) {
            score += 20;
            positiveFactors.push('DTI ratio bueno (≤30%)');
        }
        else if (dtiRatio <= 40) {
            score += 15;
            riskFactors.push('DTI ratio moderado (30-40%)');
        }
        else if (dtiRatio <= 50) {
            score += 8;
            riskFactors.push('DTI ratio alto (40-50%)');
        }
        else {
            score += 2;
            riskFactors.push('DTI ratio muy alto (>50%)');
        }
    }
    // Factor 3: Tiempo en empleo (0-20 puntos)
    const monthsAtJob = request.employment.timeAtJob;
    if (monthsAtJob >= 24) {
        score += 20;
        positiveFactors.push('Estabilidad laboral excelente (≥24 meses)');
    }
    else if (monthsAtJob >= 12) {
        score += 15;
        positiveFactors.push('Estabilidad laboral buena (≥12 meses)');
    }
    else if (monthsAtJob >= 6) {
        score += 10;
        riskFactors.push('Estabilidad laboral moderada (6-12 meses)');
    }
    else {
        score += 5;
        riskFactors.push('Estabilidad laboral baja (<6 meses)');
    }
    // Factor 4: Tipo de ingreso (0-10 puntos)
    if (request.employment.incomeType === 'salary') {
        score += 10;
        positiveFactors.push('Ingreso fijo (salario)');
    }
    else if (request.employment.incomeType === 'self_employed') {
        score += 6;
        riskFactors.push('Ingreso variable (autoempleado)');
    }
    else {
        score += 5;
    }
    // Factor 5: Pronto pago (0-10 puntos)
    const downPaymentPercent = (downPayment / vehiclePrice) * 100;
    if (downPaymentPercent >= 20) {
        score += 10;
        positiveFactors.push('Pronto pago alto (≥20%)');
    }
    else if (downPaymentPercent >= 10) {
        score += 7;
        positiveFactors.push('Pronto pago moderado (10-20%)');
    }
    else if (downPaymentPercent >= 5) {
        score += 4;
        riskFactors.push('Pronto pago bajo (5-10%)');
    }
    else {
        score += 1;
        riskFactors.push('Pronto pago muy bajo (<5%)');
    }
    // Factor 6: Estado civil y dependientes (0-5 puntos)
    if (request.personalInfo.maritalStatus === 'married' && request.personalInfo.dependents <= 2) {
        score += 5;
    }
    else if (request.personalInfo.dependents <= 2) {
        score += 3;
    }
    else {
        score += 1;
        riskFactors.push('Muchos dependientes');
    }
    // Determinar recomendación
    let recommendation;
    const probability = score / 100;
    if (score >= 75) {
        recommendation = 'approve';
        reasons.push('Score alto: Aprobación recomendada');
    }
    else if (score >= 60) {
        recommendation = 'conditional';
        reasons.push('Score moderado: Aprobación condicional recomendada');
        if (downPaymentPercent < 10) {
            reasons.push('Considerar aumentar pronto pago');
        }
    }
    else if (score >= 45) {
        recommendation = 'needs_cosigner';
        reasons.push('Score bajo: Se recomienda co-signer');
        riskFactors.push('Requiere co-signer para aprobación');
    }
    else {
        recommendation = 'reject';
        reasons.push('Score muy bajo: Rechazo recomendado');
    }
    // Sugerencias
    let suggestedDownPayment;
    let suggestedTerm;
    if (recommendation === 'conditional' || recommendation === 'needs_cosigner') {
        if (downPaymentPercent < 20) {
            suggestedDownPayment = vehiclePrice * 0.20; // Sugerir 20%
        }
        if (monthlyPayment > monthlyIncome * 0.30) {
            suggestedTerm = Math.ceil((vehiclePrice - downPayment) / (monthlyIncome * 0.30)); // Extender plazo
        }
    }
    return {
        score: Math.round(score),
        probability,
        recommendation,
        reasons,
        suggestedDownPayment,
        suggestedTerm,
        riskFactors,
        positiveFactors,
    };
}
// ============================================
// FUNCIONES DE SOLICITUD DE DOCUMENTOS
// ============================================
/**
 * Crea una solicitud de documentos con link único
 */
async function createDocumentRequest(tenantId, requestId, clientId, requestedDocuments, requestedBy, expiresInDays = 7) {
    // Generar token único
    const token = db.collection('_').doc().id;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const docRequestRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_document_requests')
        .doc();
    const docRequest = {
        tenantId,
        requestId,
        clientId,
        token,
        requestedDocuments,
        status: 'pending',
        submittedDocuments: [],
        requestedBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRequestRef.set(docRequest);
    return {
        id: docRequestRef.id,
        ...docRequest,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt,
    };
}
/**
 * Obtiene una solicitud de documentos por token
 */
async function getDocumentRequestByToken(token) {
    const snapshot = await db
        .collectionGroup('fi_document_requests')
        .where('token', '==', token)
        .limit(1)
        .get();
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    // Verificar si expiró
    const expiresAt = data.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date() && data.status === 'pending') {
        await doc.ref.update({ status: 'expired' });
        return null;
    }
    return {
        id: doc.id,
        ...data,
        createdAt: (data?.createdAt?.toDate() || new Date()),
        updatedAt: (data?.updatedAt?.toDate() || new Date()),
        expiresAt: expiresAt || new Date(),
        submittedAt: data?.submittedAt?.toDate() || undefined,
        submittedDocuments: (data?.submittedDocuments || []).map((doc) => ({
            ...doc,
            uploadedAt: doc.uploadedAt?.toDate() || new Date(),
        })),
    };
}
/**
 * Sube un documento a una solicitud
 */
async function submitDocumentToRequest(token, document) {
    const docRequest = await getDocumentRequestByToken(token);
    if (!docRequest) {
        throw new Error('Solicitud de documentos no encontrada o expirada');
    }
    if (docRequest.status !== 'pending') {
        throw new Error('Esta solicitud de documentos ya fue procesada');
    }
    const docRequestRef = db
        .collection('tenants')
        .doc(docRequest.tenantId)
        .collection('fi_document_requests')
        .doc(docRequest.id);
    const submittedDoc = {
        id: db.collection('_').doc().id,
        ...document,
        uploadedAt: new Date(),
    };
    await docRequestRef.update({
        submittedDocuments: admin.firestore.FieldValue.arrayUnion(submittedDoc),
        status: 'submitted',
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Obtiene todas las solicitudes de documentos de una solicitud F&I
 */
async function getDocumentRequestsByFIRequest(tenantId, requestId) {
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_document_requests')
        .where('requestId', '==', requestId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: (data?.createdAt?.toDate() || new Date()),
            updatedAt: (data?.updatedAt?.toDate() || new Date()),
            expiresAt: (data?.expiresAt?.toDate() || new Date()),
            submittedAt: data?.submittedAt?.toDate() || undefined,
            submittedDocuments: (data?.submittedDocuments || []).map((doc) => ({
                ...doc,
                uploadedAt: doc.uploadedAt?.toDate() || new Date(),
            })),
        };
    });
}
// ============================================
// FUNCIONES PARA CALCULADORA DE FINANCIAMIENTO
// ============================================
/**
 * Calcula financiamiento y actualiza la solicitud F&I
 */
async function calculateAndUpdateFinancing(tenantId, requestId, calculator) {
    const calculation = calculateFinancing(calculator);
    const requestRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .doc(requestId);
    await requestRef.update({
        financingCalculation: calculation,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return calculation;
}
// ============================================
// FUNCIONES PARA SCORING DE APROBACIÓN
// ============================================
/**
 * Calcula y actualiza el score de aprobación de una solicitud
 */
async function calculateAndUpdateApprovalScore(tenantId, requestId, vehiclePrice, downPayment, monthlyPayment) {
    const request = await getFIRequestById(tenantId, requestId);
    if (!request) {
        throw new Error('Solicitud F&I no encontrada');
    }
    const score = calculateApprovalScore(request, vehiclePrice, downPayment, monthlyPayment);
    const requestRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .doc(requestId);
    await requestRef.update({
        approvalScore: score,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return score;
}
// ============================================
// FUNCIONES PARA CO-SIGNERS
// ============================================
/**
 * Agrega un co-signer a una solicitud F&I
 */
async function addCosignerToRequest(tenantId, requestId, cosignerData) {
    const requestRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .doc(requestId);
    const cosigner = {
        id: db.collection('_').doc().id,
        ...cosignerData,
        documents: [],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await requestRef.update({
        cosigner,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return cosigner;
}
/**
 * Calcula score combinado (cliente + co-signer)
 */
function calculateCombinedScore(clientScore, cosignerCreditRange) {
    const cosignerScoreMap = {
        excellent: 20,
        good: 15,
        fair: 10,
        poor: 5,
        very_poor: 2,
    };
    const cosignerScore = cosignerScoreMap[cosignerCreditRange] || 0;
    // Promedio ponderado: 70% cliente, 30% co-signer
    return Math.round((clientScore.score * 0.7) + (cosignerScore * 0.3));
}
/**
 * Actualiza el estado de un co-signer
 */
async function updateCosignerStatus(tenantId, requestId, status, approvedBy) {
    const requestRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .doc(requestId);
    const updateData = {
        'cosigner.status': status,
        'cosigner.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (status === 'approved') {
        updateData['cosigner.approvedAt'] = admin.firestore.FieldValue.serverTimestamp();
    }
    await requestRef.update(updateData);
}
// ============================================
// FUNCIONES PARA MÉTRICAS F&I
// ============================================
/**
 * Obtiene métricas F&I para un período
 */
async function getFIMetrics(tenantId, startDate, endDate) {
    const requestsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();
    const requests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        submittedAt: doc.data().submittedAt?.toDate(),
        reviewedAt: doc.data().reviewedAt?.toDate(),
    }));
    const approved = requests.filter(r => r.status === 'approved').length;
    const total = requests.length;
    const approvalRate = total > 0 ? (approved / total) * 100 : 0;
    // Calcular tiempo promedio de procesamiento
    const processingTimes = [];
    requests.forEach(r => {
        if (r.submittedAt && r.reviewedAt) {
            const submitted = r.submittedAt instanceof Date ? r.submittedAt : new Date(r.submittedAt);
            const reviewed = r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt);
            const hours = (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60);
            processingTimes.push(hours);
        }
    });
    const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;
    // Agrupar por estado
    const byStatus = {
        draft: 0,
        submitted: 0,
        under_review: 0,
        pre_approved: 0,
        approved: 0,
        pending_info: 0,
        rejected: 0,
    };
    requests.forEach(r => {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    // Agrupar por vendedor
    const bySeller = {};
    requests.forEach(r => {
        if (!bySeller[r.createdBy]) {
            bySeller[r.createdBy] = { requests: 0, approvals: 0, rejections: 0, approvalRate: 0 };
        }
        bySeller[r.createdBy].requests++;
        if (r.status === 'approved')
            bySeller[r.createdBy].approvals++;
        if (r.status === 'rejected')
            bySeller[r.createdBy].rejections++;
    });
    Object.keys(bySeller).forEach(sellerId => {
        const seller = bySeller[sellerId];
        seller.approvalRate = seller.requests > 0 ? (seller.approvals / seller.requests) * 100 : 0;
    });
    // Agrupar por rango de crédito
    const byCreditRange = {
        excellent: { requests: 0, approvals: 0, approvalRate: 0 },
        good: { requests: 0, approvals: 0, approvalRate: 0 },
        fair: { requests: 0, approvals: 0, approvalRate: 0 },
        poor: { requests: 0, approvals: 0, approvalRate: 0 },
        very_poor: { requests: 0, approvals: 0, approvalRate: 0 },
    };
    requests.forEach(r => {
        const range = r.creditInfo.creditRange;
        byCreditRange[range].requests++;
        if (r.status === 'approved')
            byCreditRange[range].approvals++;
    });
    Object.keys(byCreditRange).forEach(range => {
        const cr = byCreditRange[range];
        cr.approvalRate = cr.requests > 0 ? (cr.approvals / cr.requests) * 100 : 0;
    });
    // Calcular promedios
    const incomes = requests.map(r => r.employment.monthlyIncome).filter(i => i > 0);
    const averageIncome = incomes.length > 0
        ? incomes.reduce((a, b) => a + b, 0) / incomes.length
        : 0;
    const creditScores = requests
        .map(r => r.approvalScore?.score)
        .filter((s) => s !== undefined);
    const averageCreditScore = creditScores.length > 0
        ? creditScores.reduce((a, b) => a + b, 0) / creditScores.length
        : 0;
    // Obtener información de vehículos para calcular promedios de down payment y loan amount
    let totalDownPayment = 0;
    let totalLoanAmount = 0;
    let countWithVehicle = 0;
    for (const request of requests) {
        const client = await getFIClientById(tenantId, request.clientId);
        if (client?.vehiclePrice && client?.downPayment) {
            totalDownPayment += client.downPayment;
            totalLoanAmount += client.vehiclePrice - client.downPayment;
            countWithVehicle++;
        }
    }
    return {
        period: { start: startDate, end: endDate },
        approvalRate,
        averageProcessingTime,
        pendingRequests: byStatus.submitted + byStatus.under_review + byStatus.pending_info,
        byStatus,
        averageIncome,
        averageCreditScore,
        averageDownPayment: countWithVehicle > 0 ? totalDownPayment / countWithVehicle : 0,
        averageLoanAmount: countWithVehicle > 0 ? totalLoanAmount / countWithVehicle : 0,
        bySeller,
        byCreditRange,
    };
}
// ============================================
// FUNCIONES PARA WORKFLOWS F&I
// ============================================
/**
 * Crea un workflow F&I
 */
async function createFIWorkflow(tenantId, workflowData) {
    const workflowRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_workflows')
        .doc();
    const workflow = {
        id: workflowRef.id,
        tenantId,
        ...workflowData,
        runCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await workflowRef.set({
        ...workflow,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return workflow;
}
/**
 * Obtiene todos los workflows F&I de un tenant
 */
async function getFIWorkflows(tenantId, activeOnly) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_workflows')
        .orderBy('createdAt', 'desc');
    if (activeOnly) {
        query = query.where('isActive', '==', true);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        lastRunAt: doc.data().lastRunAt?.toDate(),
    }));
}
/**
 * Ejecuta workflows activos para una solicitud F&I
 */
async function executeFIWorkflows(tenantId, request) {
    const workflowsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_workflows')
        .where('isActive', '==', true)
        .get();
    const workflows = workflowsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));
    for (const workflow of workflows) {
        let shouldExecute = false;
        // Evaluar condiciones
        for (const condition of workflow.conditions) {
            let value;
            switch (condition.field) {
                case 'approvalScore.score':
                    value = request.approvalScore?.score || 0;
                    break;
                case 'creditInfo.creditRange':
                    value = request.creditInfo.creditRange;
                    break;
                case 'status':
                    value = request.status;
                    break;
                case 'employment.monthlyIncome':
                    value = request.employment.monthlyIncome;
                    break;
                default:
                    continue;
            }
            let matches = false;
            switch (condition.operator) {
                case 'equals':
                    matches = value === condition.value;
                    break;
                case 'greater_than':
                    matches = value > condition.value;
                    break;
                case 'less_than':
                    matches = value < condition.value;
                    break;
                case 'contains':
                    matches = String(value).includes(String(condition.value));
                    break;
                case 'in':
                    matches = Array.isArray(condition.value) && condition.value.includes(value);
                    break;
            }
            if (!matches) {
                shouldExecute = false;
                break;
            }
            shouldExecute = true;
        }
        if (shouldExecute) {
            // Ejecutar acciones
            for (const action of workflow.actions) {
                switch (action.type) {
                    case 'change_status':
                        await updateFIRequestStatus(tenantId, request.id, action.config.status, 'system', action.config.notes);
                        break;
                    case 'request_documents':
                        // Implementar solicitud de documentos
                        break;
                    case 'notify':
                        // Implementar notificación
                        break;
                    case 'send_email':
                        // Implementar envío de email
                        break;
                    case 'pre_approve':
                        await updateFIRequestStatus(tenantId, request.id, 'pre_approved', 'system', 'Pre-aprobado automáticamente por workflow');
                        break;
                }
            }
            // Actualizar contador de ejecuciones
            const workflowRef = db
                .collection('tenants')
                .doc(tenantId)
                .collection('fi_workflows')
                .doc(workflow.id);
            await workflowRef.update({
                runCount: admin.firestore.FieldValue.increment(1),
                lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
}
// ============================================
// FUNCIONES PARA COMPARACIÓN DE FINANCIAMIENTO
// ============================================
/**
 * Compara múltiples opciones de financiamiento
 */
function compareFinancingOptions(request, vehiclePrice, downPayment, options) {
    // Calcular score de aprobación para cada opción
    const optionsWithScores = options.map(option => {
        const calculation = calculateFinancing({
            vehiclePrice,
            downPayment,
            interestRate: option.interestRate,
            loanTerm: option.term,
            monthlyIncome: request.employment.monthlyIncome,
        });
        return {
            ...option,
            calculatedMonthlyPayment: calculation.monthlyPayment,
            calculatedTotalAmount: calculation.totalAmount,
            affordability: calculation.affordability,
        };
    });
    // Ordenar por mejor opción (menor pago mensual, mayor probabilidad de aprobación)
    optionsWithScores.sort((a, b) => {
        // Priorizar por probabilidad de aprobación primero
        if (Math.abs(a.approvalProbability - b.approvalProbability) > 0.1) {
            return b.approvalProbability - a.approvalProbability;
        }
        // Luego por pago mensual
        return a.calculatedMonthlyPayment - b.calculatedMonthlyPayment;
    });
    const bestOption = optionsWithScores[0];
    let recommendation = `Recomendamos ${bestOption.lender} con un pago mensual de $${bestOption.calculatedMonthlyPayment.toFixed(2)}`;
    if (bestOption.approvalProbability >= 0.8) {
        recommendation += ' y alta probabilidad de aprobación.';
    }
    else if (bestOption.approvalProbability >= 0.6) {
        recommendation += ' y probabilidad moderada de aprobación.';
    }
    else {
        recommendation += ', aunque la probabilidad de aprobación es baja.';
    }
    return {
        bestOption: bestOption,
        comparison: optionsWithScores,
        recommendation,
    };
}
// ============================================
// FUNCIONES PARA VALIDACIÓN DE DOCUMENTOS (Placeholder para IA)
// ============================================
/**
 * Valida un documento usando IA (placeholder - requiere implementación con servicio de IA)
 */
async function validateDocument(documentUrl, documentType, request) {
    // TODO: Implementar con servicio de IA/OCR
    // Por ahora retorna validación básica
    return {
        isValid: true,
        isLegible: true,
        extractedData: {},
        matchesRequest: true,
        discrepancies: [],
        confidence: 0.8,
        validationDate: new Date(),
    };
}
// ============================================
// FUNCIONES PARA REPORTE DE CRÉDITO (Placeholder para API externa)
// ============================================
/**
 * Obtiene reporte de crédito de una API externa (placeholder)
 */
async function pullCreditReport(tenantId, clientId, clientData, provider) {
    try {
        // Obtener configuración de crédito del tenant
        const db = (0, core_1.getFirestore)();
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();
        const creditConfig = tenantData?.creditConfig || {};
        const selectedProvider = provider || creditConfig.defaultProvider || 'mock';
        // Si no hay credenciales configuradas, usar mock
        if (selectedProvider === 'mock' || !creditConfig[selectedProvider]?.apiKey) {
            return generateMockCreditReport(clientData);
        }
        // Integración real con APIs de crédito
        switch (selectedProvider) {
            case 'experian':
                return await pullExperianCreditReport(clientData, creditConfig.experian);
            case 'equifax':
                return await pullEquifaxCreditReport(clientData, creditConfig.equifax);
            case 'transunion':
                return await pullTransUnionCreditReport(clientData, creditConfig.transunion);
            default:
                return generateMockCreditReport(clientData);
        }
    }
    catch (error) {
        console.error('Error pulling credit report:', error);
        // En caso de error, retornar reporte mock como fallback
        return generateMockCreditReport(clientData);
    }
}
// Función auxiliar para generar reporte mock (para desarrollo/testing)
function generateMockCreditReport(clientData) {
    // Generar score basado en hash del nombre para consistencia
    const nameHash = (clientData.firstName + clientData.lastName).length;
    const creditScore = 600 + (nameHash % 200); // Score entre 600-800
    let creditRange = 'fair';
    if (creditScore >= 750)
        creditRange = 'excellent';
    else if (creditScore >= 700)
        creditRange = 'good';
    else if (creditScore >= 650)
        creditRange = 'fair';
    else
        creditRange = 'poor';
    return {
        creditScore,
        creditRange,
        paymentHistory: {
            onTime: Math.floor(Math.random() * 50) + 20,
            late: Math.floor(Math.random() * 5),
            missed: Math.floor(Math.random() * 2),
            totalAccounts: Math.floor(Math.random() * 10) + 3,
        },
        currentDebts: Math.floor(Math.random() * 50000) + 10000,
        openCreditLines: Math.floor(Math.random() * 8) + 2,
        inquiries: Math.floor(Math.random() * 5),
        verified: true,
        reportDate: new Date(),
        provider: 'mock',
    };
}
// Integración con Experian (requiere credenciales reales)
async function pullExperianCreditReport(clientData, config) {
    // TODO: Implementar llamada real a Experian API
    // Por ahora retorna mock
    console.log('Experian API integration not yet implemented. Using mock data.');
    return generateMockCreditReport(clientData);
}
// Integración con Equifax (requiere credenciales reales)
async function pullEquifaxCreditReport(clientData, config) {
    // TODO: Implementar llamada real a Equifax API
    // Por ahora retorna mock
    console.log('Equifax API integration not yet implemented. Using mock data.');
    return generateMockCreditReport(clientData);
}
// Integración con TransUnion (requiere credenciales reales)
async function pullTransUnionCreditReport(clientData, config) {
    // TODO: Implementar llamada real a TransUnion API
    // Por ahora retorna mock
    console.log('TransUnion API integration not yet implemented. Using mock data.');
    return generateMockCreditReport(clientData);
}
//# sourceMappingURL=finance-insurance.js.map
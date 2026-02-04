"use strict";
// Gestión de leads
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
exports.createLead = createLead;
exports.getLeadById = getLeadById;
exports.getLeads = getLeads;
exports.updateLeadStatus = updateLeadStatus;
exports.assignLead = assignLead;
exports.addInteraction = addInteraction;
exports.updateLead = updateLead;
exports.findLeadByPhone = findLeadByPhone;
exports.findLeadByPhoneInTenant = findLeadByPhoneInTenant;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, core_1.getFirestore)();
}
/**
 * Crea un nuevo lead
 */
async function createLead(tenantId, source, contact, notes) {
    const leadData = {
        tenantId,
        source,
        status: 'new',
        contact,
        notes: notes || '',
        interactions: [],
    };
    const db = getDb();
    const docRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc();
    await docRef.set({
        ...leadData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const newLead = {
        id: docRef.id,
        ...leadData,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    // Clasificar automáticamente con IA si está habilitado (asíncrono, no bloquea)
    try {
        const { classifyLeadWithTenantConfig } = await Promise.resolve().then(() => __importStar(require('@autodealers/ai')));
        const classification = await classifyLeadWithTenantConfig(tenantId, {
            name: contact.name,
            phone: contact.phone,
            source,
            messages: notes ? [notes] : [],
        });
        if (classification) {
            await docRef.update({
                aiClassification: {
                    priority: classification.priority,
                    sentiment: classification.sentiment,
                    intent: classification.intent,
                    confidence: classification.confidence,
                    reasoning: classification.reasoning,
                },
            });
            newLead.aiClassification = {
                priority: classification.priority,
                sentiment: classification.sentiment,
                intent: classification.intent,
                confidence: classification.confidence,
                reasoning: classification.reasoning,
            };
        }
    }
    catch (error) {
        // No fallar si la IA no está disponible
        console.warn('IA classification skipped for new lead:', error);
    }
    // Calcular score automático si está habilitado (asíncrono, no bloquea)
    try {
        const { calculateAutomaticScore, updateLeadScore } = await Promise.resolve().then(() => __importStar(require('./scoring')));
        const automaticScore = await calculateAutomaticScore(tenantId, newLead);
        if (automaticScore > 0) {
            await updateLeadScore(tenantId, newLead.id, automaticScore, undefined, 'Score calculado automáticamente al crear lead', 'system');
            newLead.score = {
                automatic: automaticScore,
                combined: automaticScore,
                lastUpdated: new Date(),
                history: [{
                        score: automaticScore,
                        type: 'automatic',
                        reason: 'Score calculado automáticamente al crear lead',
                        updatedBy: 'system',
                        updatedAt: new Date(),
                    }],
            };
        }
    }
    catch (error) {
        // No fallar si el scoring no está disponible
        console.warn('Scoring calculation skipped for new lead:', error);
    }
    // Notificar a gerentes y administradores sobre el nuevo lead (asíncrono, no bloquea)
    try {
        const { notifyManagersAndAdmins } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
        await notifyManagersAndAdmins(tenantId, {
            type: 'lead_created',
            title: 'Nuevo Lead Creado',
            message: `Se ha creado un nuevo lead de ${contact.name} (${contact.phone}) desde ${source}. ${notes ? `Notas: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}` : ''}`,
            metadata: {
                leadId: newLead.id,
                contactName: contact.name,
                contactPhone: contact.phone,
                source,
            },
        });
    }
    catch (error) {
        // No fallar si las notificaciones no están disponibles
        console.warn('Manager notification skipped for new lead:', error);
    }
    return newLead;
}
/**
 * Obtiene un lead por ID
 */
async function getLeadById(tenantId, leadId) {
    const db = getDb();
    const leadDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId)
        .get();
    if (!leadDoc.exists) {
        return null;
    }
    const data = leadDoc.data();
    return {
        id: leadDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Obtiene leads por tenant con filtros
 */
async function getLeads(tenantId, filters) {
    const db = getDb();
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads');
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    if (filters?.assignedTo) {
        query = query.where('assignedTo', '==', filters.assignedTo);
    }
    if (filters?.source) {
        query = query.where('source', '==', filters.source);
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
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Actualiza el estado de un lead
 */
async function updateLeadStatus(tenantId, leadId, status) {
    const db = getDb();
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId)
        .update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Asigna un lead a un vendedor
 */
async function assignLead(tenantId, leadId, userId) {
    const db = getDb();
    // Obtener información del lead antes de actualizar
    const leadDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId)
        .get();
    const leadData = leadDoc.data();
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId)
        .update({
        assignedTo: userId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Obtener información del vendedor asignado
    const sellerDoc = await db.collection('users').doc(userId).get();
    const sellerName = sellerDoc.data()?.name || 'Vendedor';
    // Notificar a gerentes y administradores sobre la asignación (asíncrono, no bloquea)
    try {
        const { notifyManagersAndAdmins } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
        await notifyManagersAndAdmins(tenantId, {
            type: 'lead_assigned',
            title: 'Lead Asignado',
            message: `El lead de ${leadData?.contact?.name || 'Cliente'} (${leadData?.contact?.phone || ''}) ha sido asignado a ${sellerName}.`,
            metadata: {
                leadId,
                assignedTo: userId,
                assignedToName: sellerName,
                contactName: leadData?.contact?.name,
                contactPhone: leadData?.contact?.phone,
            },
        });
    }
    catch (error) {
        // No fallar si las notificaciones no están disponibles
        console.warn('Manager notification skipped for lead assignment:', error);
    }
}
/**
 * Agrega una interacción a un lead
 */
async function addInteraction(tenantId, leadId, interaction) {
    const interactionData = {
        id: admin.firestore.FieldValue.serverTimestamp().toString(),
        ...interaction,
        createdAt: new Date(),
    };
    const db = getDb();
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId)
        .update({
        interactions: admin.firestore.FieldValue.arrayUnion(interactionData),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Actualiza un lead
 */
async function updateLead(tenantId, leadId, updates) {
    const db = getDb();
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId)
        .update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Busca un lead existente por teléfono (en cualquier tenant)
 * Útil para webhooks que no conocen el tenantId
 */
async function findLeadByPhone(phone) {
    // Normalizar teléfono (remover espacios, guiones, etc)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    const db = getDb();
    // Buscar en todos los tenants (esto puede ser costoso, pero necesario para webhooks)
    const tenantsSnapshot = await db.collection('tenants').get();
    for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const leadsSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .where('contact.phone', '==', phone)
            .limit(1)
            .get();
        if (!leadsSnapshot.empty) {
            const leadDoc = leadsSnapshot.docs[0];
            const data = leadDoc.data();
            return {
                id: leadDoc.id,
                ...data,
                createdAt: data?.createdAt?.toDate() || new Date(),
                updatedAt: data?.updatedAt?.toDate() || new Date(),
            };
        }
        // También buscar con teléfono normalizado
        const leadsSnapshotNormalized = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .where('contact.phone', '==', normalizedPhone)
            .limit(1)
            .get();
        if (!leadsSnapshotNormalized.empty) {
            const leadDoc = leadsSnapshotNormalized.docs[0];
            const data = leadDoc.data();
            return {
                id: leadDoc.id,
                ...data,
                createdAt: data?.createdAt?.toDate() || new Date(),
                updatedAt: data?.updatedAt?.toDate() || new Date(),
            };
        }
    }
    return null;
}
/**
 * Busca un lead por teléfono en un tenant específico
 */
async function findLeadByPhoneInTenant(tenantId, phone) {
    const db = getDb();
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    // Buscar con teléfono original
    let snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .where('contact.phone', '==', phone)
        .limit(1)
        .get();
    if (snapshot.empty && normalizedPhone !== phone) {
        // Buscar con teléfono normalizado
        snapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .where('contact.phone', '==', normalizedPhone)
            .limit(1)
            .get();
    }
    if (snapshot.empty) {
        return null;
    }
    const leadDoc = snapshot.docs[0];
    const data = leadDoc.data();
    return {
        id: leadDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
//# sourceMappingURL=leads.js.map
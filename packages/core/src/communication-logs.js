"use strict";
// Sistema de logs de comunicaciones enviadas
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
exports.logCommunication = logCommunication;
exports.getCommunicationLogs = getCommunicationLogs;
exports.getCommunicationStats = getCommunicationStats;
exports.notifyAdminTemplateCreated = notifyAdminTemplateCreated;
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("@autodealers/shared");
let db = null;
function getDb() {
    if (!db) {
        db = (0, shared_1.getFirestore)();
    }
    return db;
}
/**
 * Registra un envío de comunicación
 */
async function logCommunication(data) {
    const firestore = getDb();
    const docRef = firestore.collection('communication_logs').doc();
    await docRef.set({
        ...data,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Crear notificación para el admin
    await createAdminNotification({
        type: 'communication_sent',
        title: `Template enviado: ${data.templateName}`,
        message: `Se envió un ${data.type} a ${data.recipientEmail} (Evento: ${data.event})`,
        data: {
            logId: docRef.id,
            templateId: data.templateId,
            tenantId: data.tenantId,
            status: data.status,
        },
    });
    return docRef.id;
}
/**
 * Obtiene logs con filtros
 */
async function getCommunicationLogs(filters) {
    const firestore = getDb();
    let query = firestore.collection('communication_logs');
    if (filters?.tenantId) {
        query = query.where('tenantId', '==', filters.tenantId);
    }
    if (filters?.type) {
        query = query.where('type', '==', filters.type);
    }
    if (filters?.event) {
        query = query.where('event', '==', filters.event);
    }
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    // Ordenar por fecha descendente
    try {
        query = query.orderBy('sentAt', 'desc');
    }
    catch (error) {
        // Si falla por índice, continuar sin ordenar
        console.warn('Could not order by sentAt, index might be missing');
    }
    if (filters?.limit) {
        query = query.limit(filters.limit);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            sentAt: data.sentAt?.toDate() || new Date(),
        };
    });
}
/**
 * Obtiene estadísticas de comunicaciones
 */
async function getCommunicationStats(filters) {
    const logs = await getCommunicationLogs(filters);
    const stats = {
        total: logs.length,
        success: logs.filter((log) => log.status === 'success').length,
        failed: logs.filter((log) => log.status === 'failed').length,
        byType: {},
        byEvent: {},
    };
    logs.forEach((log) => {
        stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
        stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1;
    });
    return stats;
}
/**
 * Crea una notificación para el admin
 */
async function createAdminNotification(data) {
    const firestore = getDb();
    // Obtener todos los admins
    const adminsSnapshot = await firestore
        .collection('users')
        .where('role', '==', 'admin')
        .get();
    // Crear notificación para cada admin
    const promises = adminsSnapshot.docs.map((adminDoc) => firestore.collection('notifications').add({
        userId: adminDoc.id,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }));
    await Promise.all(promises);
}
/**
 * Notifica al admin cuando se crea un nuevo template
 */
async function notifyAdminTemplateCreated(data) {
    await createAdminNotification({
        type: 'template_created',
        title: 'Nuevo template creado',
        message: `Se creó un nuevo template "${data.templateName}" (${data.type} - ${data.event})`,
        data: {
            templateId: data.templateId,
            templateName: data.templateName,
            type: data.type,
            event: data.event,
            createdBy: data.createdBy,
        },
    });
}

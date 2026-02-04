"use strict";
// Recordatorios post-venta
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
exports.createReminder = createReminder;
exports.createPostSaleReminders = createPostSaleReminders;
exports.getAllReminders = getAllReminders;
exports.getPendingReminders = getPendingReminders;
exports.markReminderAsSent = markReminderAsSent;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Crea un recordatorio individual
 */
async function createReminder(reminderData) {
    const docRef = db
        .collection('tenants')
        .doc(reminderData.tenantId)
        .collection('post_sale_reminders')
        .doc();
    await docRef.set({
        ...reminderData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        id: docRef.id,
        ...reminderData,
        createdAt: new Date(),
    };
}
/**
 * Crea recordatorios post-venta automáticamente
 */
async function createPostSaleReminders(tenantId, saleId, customerId, vehicleId, selectedReminders // Recordatorios seleccionados por el usuario
) {
    // Si se especifican recordatorios, usar solo esos
    const reminderTypes = selectedReminders || ['oil_change_filter_3', 'tire_rotation'];
    // Crear recordatorios según selección
    const remindersData = [];
    // Manejar cambio de aceite con diferentes frecuencias
    if (reminderTypes.includes('oil_change_filter_3') || reminderTypes.includes('oil_change_filter')) {
        remindersData.push({
            tenantId,
            saleId,
            customerId,
            vehicleId,
            type: 'custom',
            customType: 'Cambio de Aceite y Filtro',
            frequency: '3_months',
            nextReminder: addMonths(new Date(), 3),
            channels: ['email', 'whatsapp'],
            status: 'active',
        });
    }
    if (reminderTypes.includes('oil_change_filter_5')) {
        remindersData.push({
            tenantId,
            saleId,
            customerId,
            vehicleId,
            type: 'custom',
            customType: 'Cambio de Aceite y Filtro',
            frequency: '5_months',
            nextReminder: addMonths(new Date(), 5),
            channels: ['email', 'whatsapp'],
            status: 'active',
        });
    }
    if (reminderTypes.includes('oil_change_filter_6')) {
        remindersData.push({
            tenantId,
            saleId,
            customerId,
            vehicleId,
            type: 'custom',
            customType: 'Cambio de Aceite y Filtro',
            frequency: '6_months',
            nextReminder: addMonths(new Date(), 6),
            channels: ['email', 'whatsapp'],
            status: 'active',
        });
    }
    if (reminderTypes.includes('tire_rotation')) {
        remindersData.push({
            tenantId,
            saleId,
            customerId,
            vehicleId,
            type: 'tire_rotation',
            frequency: '6_months',
            nextReminder: addMonths(new Date(), 6),
            channels: ['email', 'sms'],
            status: 'active',
        });
    }
    // Agregar otros tipos si están seleccionados
    if (reminderTypes.includes('oil_change') && !reminderTypes.includes('oil_change_filter')) {
        remindersData.push({
            tenantId,
            saleId,
            customerId,
            vehicleId,
            type: 'oil_change',
            frequency: '3_months',
            nextReminder: addMonths(new Date(), 3),
            channels: ['email', 'whatsapp'],
            status: 'active',
        });
    }
    if (reminderTypes.includes('filter') && !reminderTypes.includes('oil_change_filter')) {
        remindersData.push({
            tenantId,
            saleId,
            customerId,
            vehicleId,
            type: 'filter',
            frequency: '6_months',
            nextReminder: addMonths(new Date(), 6),
            channels: ['email'],
            status: 'active',
        });
    }
    // Guardar en Firestore
    const reminders = [];
    for (const reminderData of remindersData) {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('post_sale_reminders')
            .doc();
        await docRef.set({
            ...reminderData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        reminders.push({
            id: docRef.id,
            ...reminderData,
            createdAt: new Date(),
        });
    }
    return reminders;
}
/**
 * Obtiene todos los recordatorios (activos y completados)
 */
async function getAllReminders(tenantId, filters) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('post_sale_reminders');
    // Aplicar filtro de status si existe (requiere índice)
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    // Ordenar por nextReminder (requiere índice)
    // Si hay filtros de fecha, los aplicaremos en memoria para evitar índices compuestos
    if (!filters?.startDate && !filters?.endDate) {
        query = query.orderBy('nextReminder', 'asc');
    }
    const snapshot = await query.get();
    let reminders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            nextReminder: data?.nextReminder?.toDate() || new Date(),
            sentAt: data?.sentAt?.toDate(),
            createdAt: data?.createdAt?.toDate() || new Date(),
        };
    });
    // Filtrar por fecha en memoria si es necesario
    if (filters?.startDate) {
        reminders = reminders.filter((r) => r.nextReminder >= filters.startDate);
    }
    if (filters?.endDate) {
        reminders = reminders.filter((r) => r.nextReminder <= filters.endDate);
    }
    // Ordenar por fecha si no se ordenó en la consulta
    if (filters?.startDate || filters?.endDate) {
        reminders.sort((a, b) => a.nextReminder.getTime() - b.nextReminder.getTime());
    }
    return reminders;
}
/**
 * Obtiene recordatorios pendientes
 */
async function getPendingReminders(tenantId, beforeDate) {
    const now = beforeDate || new Date();
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('post_sale_reminders')
        .where('status', '==', 'active')
        .where('nextReminder', '<=', now);
    query = query.orderBy('nextReminder', 'asc');
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            nextReminder: data?.nextReminder?.toDate() || new Date(),
            sentAt: data?.sentAt?.toDate(),
            createdAt: data?.createdAt?.toDate() || new Date(),
        };
    });
}
/**
 * Marca un recordatorio como enviado
 */
async function markReminderAsSent(tenantId, reminderId) {
    const reminder = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('post_sale_reminders')
        .doc(reminderId)
        .get();
    if (!reminder.exists) {
        throw new Error('Recordatorio no encontrado');
    }
    const data = reminder.data();
    // Calcular próxima fecha según frecuencia
    let nextReminder;
    switch (data.frequency) {
        case 'monthly':
            nextReminder = addMonths(new Date(), 1);
            break;
        case '3_months':
            nextReminder = addMonths(new Date(), 3);
            break;
        case '5_months':
            nextReminder = addMonths(new Date(), 5);
            break;
        case '6_months':
            nextReminder = addMonths(new Date(), 6);
            break;
        default:
            // Manual - no actualizar
            return;
    }
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('post_sale_reminders')
        .doc(reminderId)
        .update({
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        nextReminder,
    });
}
/**
 * Calcula la próxima fecha de recordatorio
 */
function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}
//# sourceMappingURL=post-sale.js.map
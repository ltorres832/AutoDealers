"use strict";
// Gestión de citas
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
exports.createAppointment = createAppointment;
exports.getAppointmentById = getAppointmentById;
exports.getAppointments = getAppointments;
exports.getAppointmentsBySeller = getAppointmentsBySeller;
exports.getLeadAppointments = getLeadAppointments;
exports.updateAppointmentStatus = updateAppointmentStatus;
exports.cancelAppointment = cancelAppointment;
exports.addReminder = addReminder;
exports.checkAvailability = checkAvailability;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Crea una nueva cita
 */
async function createAppointment(appointmentData) {
    // Verificar disponibilidad
    const isAvailable = await checkAvailability(appointmentData.tenantId, appointmentData.assignedTo, appointmentData.scheduledAt, appointmentData.duration);
    if (!isAvailable) {
        throw new Error('El horario no está disponible');
    }
    const docRef = db
        .collection('tenants')
        .doc(appointmentData.tenantId)
        .collection('appointments')
        .doc();
    await docRef.set({
        ...appointmentData,
        reminders: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const newAppointment = {
        id: docRef.id,
        ...appointmentData,
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    // Obtener información del lead y vendedor para la notificación
    try {
        const { getLeadById } = await Promise.resolve().then(() => __importStar(require('./leads')));
        const lead = await getLeadById(appointmentData.tenantId, appointmentData.leadId);
        const sellerDoc = await db.collection('users').doc(appointmentData.assignedTo).get();
        const sellerName = sellerDoc.data()?.name || 'Vendedor';
        const appointmentDate = new Date(appointmentData.scheduledAt);
        const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        // Notificar a gerentes y administradores sobre la nueva cita (asíncrono, no bloquea)
        const { notifyManagersAndAdmins } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
        await notifyManagersAndAdmins(appointmentData.tenantId, {
            type: 'appointment_created',
            title: 'Nueva Cita Programada',
            message: `Se ha programado una nueva cita de tipo ${appointmentData.type} para ${lead?.contact?.name || 'Cliente'} (${lead?.contact?.phone || ''}) con ${sellerName} el ${formattedDate}.`,
            metadata: {
                appointmentId: newAppointment.id,
                leadId: appointmentData.leadId,
                assignedTo: appointmentData.assignedTo,
                assignedToName: sellerName,
                type: appointmentData.type,
                scheduledAt: appointmentData.scheduledAt.toISOString(),
                contactName: lead?.contact?.name,
                contactPhone: lead?.contact?.phone,
            },
        });
    }
    catch (error) {
        // No fallar si las notificaciones no están disponibles
        console.warn('Manager notification skipped for new appointment:', error);
    }
    return newAppointment;
}
/**
 * Obtiene una cita por ID
 */
async function getAppointmentById(tenantId, appointmentId) {
    const appointmentDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments')
        .doc(appointmentId)
        .get();
    if (!appointmentDoc.exists) {
        return null;
    }
    const data = appointmentDoc.data();
    return {
        id: appointmentDoc.id,
        ...data,
        scheduledAt: data?.scheduledAt?.toDate() || new Date(),
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Obtiene todas las citas de un tenant
 */
async function getAppointments(tenantId, startDate, endDate) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments');
    if (startDate) {
        query = query.where('scheduledAt', '>=', startDate);
    }
    if (endDate) {
        query = query.where('scheduledAt', '<=', endDate);
    }
    query = query.orderBy('scheduledAt', 'asc');
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            scheduledAt: data?.scheduledAt?.toDate() || new Date(),
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Obtiene citas de un vendedor
 */
async function getAppointmentsBySeller(tenantId, sellerId, startDate, endDate) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments')
        .where('assignedTo', '==', sellerId);
    if (startDate) {
        query = query.where('scheduledAt', '>=', startDate);
    }
    if (endDate) {
        query = query.where('scheduledAt', '<=', endDate);
    }
    query = query.orderBy('scheduledAt', 'asc');
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            scheduledAt: data?.scheduledAt?.toDate() || new Date(),
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Obtiene citas de un lead
 */
async function getLeadAppointments(tenantId, leadId) {
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments')
        .where('leadId', '==', leadId)
        .orderBy('scheduledAt', 'asc')
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            scheduledAt: data?.scheduledAt?.toDate() || new Date(),
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Actualiza el estado de una cita
 */
async function updateAppointmentStatus(tenantId, appointmentId, status) {
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments')
        .doc(appointmentId)
        .update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Cancela una cita
 */
async function cancelAppointment(tenantId, appointmentId, reason) {
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments')
        .doc(appointmentId)
        .update({
        status: 'cancelled',
        notes: reason ? `Cancelada: ${reason}` : undefined,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Agrega un recordatorio a una cita
 */
async function addReminder(tenantId, appointmentId, reminder) {
    const appointment = await getAppointmentById(tenantId, appointmentId);
    if (!appointment) {
        throw new Error('Cita no encontrada');
    }
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments')
        .doc(appointmentId)
        .update({
        reminders: admin.firestore.FieldValue.arrayUnion(reminder),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Verifica disponibilidad de horario
 */
async function checkAvailability(tenantId, sellerId, scheduledAt, duration) {
    const endTime = new Date(scheduledAt.getTime() + duration * 60 * 1000);
    // Obtener citas existentes del vendedor en ese rango
    const existingAppointments = await getAppointmentsBySeller(tenantId, sellerId, scheduledAt, endTime);
    // Filtrar solo las que están activas (no canceladas)
    const activeAppointments = existingAppointments.filter((apt) => apt.status !== 'cancelled' && apt.status !== 'completed');
    // Verificar si hay conflicto
    for (const apt of activeAppointments) {
        const aptEnd = new Date(apt.scheduledAt.getTime() + apt.duration * 60 * 1000);
        if ((scheduledAt >= apt.scheduledAt && scheduledAt < aptEnd) ||
            (endTime > apt.scheduledAt && endTime <= aptEnd) ||
            (scheduledAt <= apt.scheduledAt && endTime >= aptEnd)) {
            return false; // Hay conflicto
        }
    }
    return true; // Disponible
}
//# sourceMappingURL=appointments.js.map
"use strict";
// Sistema de Anuncios y Notificaciones Globales
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
exports.createGlobalAnnouncement = createGlobalAnnouncement;
exports.getActiveAnnouncements = getActiveAnnouncements;
exports.dismissAnnouncement = dismissAnnouncement;
exports.getAllAnnouncements = getAllAnnouncements;
exports.updateGlobalAnnouncement = updateGlobalAnnouncement;
exports.deleteGlobalAnnouncement = deleteGlobalAnnouncement;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const notifications_1 = require("./notifications");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea un nuevo anuncio global
 */
async function createGlobalAnnouncement(announcement, sendNotifications = true) {
    const docRef = getDb().collection('global_announcements').doc();
    const announcementData = {
        ...announcement,
        dismissedBy: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRef.set(announcementData);
    const created = {
        id: docRef.id,
        ...announcement,
        dismissedBy: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    // Enviar notificaciones si se solicita
    if (sendNotifications && announcement.isActive) {
        await sendAnnouncementNotifications(created);
    }
    return created;
}
/**
 * Envía notificaciones del anuncio a los usuarios afectados
 */
async function sendAnnouncementNotifications(announcement) {
    // Obtener todos los tenants si no hay targets específicos
    const tenantsSnapshot = announcement.targetTenants && announcement.targetTenants.length > 0
        ? await Promise.all(announcement.targetTenants.map(id => getDb().collection('tenants').doc(id).get()))
        : await getDb().collection('tenants').get();
    const tenants = announcement.targetTenants && announcement.targetTenants.length > 0
        ? tenantsSnapshot.filter((doc) => doc.exists).map((doc) => doc.id)
        : tenantsSnapshot.docs.map((doc) => doc.id);
    // Enviar notificaciones a cada tenant afectado
    for (const tenantId of tenants) {
        // Obtener usuarios del tenant con los roles objetivo
        const usersQuery = getDb().collection('users')
            .where('tenantId', '==', tenantId);
        if (announcement.targetRoles && announcement.targetRoles.length > 0) {
            usersQuery.where('role', 'in', announcement.targetRoles);
        }
        const usersSnapshot = await usersQuery.get();
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            // Verificar si el dashboard del usuario está en los targets
            const userDashboard = userData.role === 'admin' ? 'admin' :
                userData.role === 'dealer' ? 'dealer' :
                    userData.role === 'seller' ? 'seller' : 'public';
            if (announcement.targetDashboards.includes(userDashboard)) {
                await (0, notifications_1.createNotification)({
                    tenantId,
                    userId: userDoc.id,
                    type: 'announcement',
                    title: announcement.title,
                    message: announcement.message,
                    channels: ['system'],
                    metadata: {
                        announcementId: announcement.id,
                        priority: announcement.priority,
                        actionUrl: announcement.actionUrl,
                    },
                });
            }
        }
    }
}
/**
 * Obtiene anuncios activos para un dashboard específico
 */
async function getActiveAnnouncements(dashboard, userId, tenantId) {
    const now = new Date();
    let query = getDb().collection('global_announcements')
        .where('isActive', '==', true)
        .where('targetDashboards', 'array-contains', dashboard);
    const snapshot = await query.get();
    const announcements = [];
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Verificar fechas
        if (data.startDate && data.startDate.toDate() > now) {
            return; // Aún no ha comenzado
        }
        if (data.endDate && data.endDate.toDate() < now) {
            return; // Ya terminó
        }
        // Verificar si el usuario ya lo descartó
        if (userId && data.dismissedBy && data.dismissedBy.includes(userId)) {
            return;
        }
        // Verificar si hay targets específicos de tenants
        if (data.targetTenants && data.targetTenants.length > 0) {
            if (!tenantId || !data.targetTenants.includes(tenantId)) {
                return; // No aplica a este tenant
            }
        }
        announcements.push({
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            dismissedBy: data.dismissedBy || [],
        });
    });
    // Ordenar por prioridad (urgent > high > medium > low)
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    announcements.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    return announcements;
}
/**
 * Marca un anuncio como descartado por un usuario
 */
async function dismissAnnouncement(announcementId, userId) {
    const docRef = getDb().collection('global_announcements').doc(announcementId);
    const doc = await docRef.get();
    if (!doc.exists) {
        throw new Error('Anuncio no encontrado');
    }
    const data = doc.data();
    const dismissedBy = data?.dismissedBy || [];
    if (!dismissedBy.includes(userId)) {
        await docRef.update({
            dismissedBy: admin.firestore.FieldValue.arrayUnion(userId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
}
/**
 * Obtiene todos los anuncios (para admin)
 */
async function getAllAnnouncements() {
    const snapshot = await getDb().collection('global_announcements')
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        dismissedBy: doc.data().dismissedBy || [],
    }));
}
/**
 * Actualiza un anuncio
 */
async function updateGlobalAnnouncement(announcementId, updates) {
    const docRef = getDb().collection('global_announcements').doc(announcementId);
    const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Eliminar campos que no deben actualizarse directamente
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    await docRef.update(updateData);
    const updated = await docRef.get();
    return {
        id: updated.id,
        ...updated.data(),
        startDate: updated.data()?.startDate?.toDate(),
        endDate: updated.data()?.endDate?.toDate(),
        createdAt: updated.data()?.createdAt?.toDate() || new Date(),
        updatedAt: updated.data()?.updatedAt?.toDate() || new Date(),
        dismissedBy: updated.data()?.dismissedBy || [],
    };
}
/**
 * Elimina un anuncio
 */
async function deleteGlobalAnnouncement(announcementId) {
    await getDb().collection('global_announcements').doc(announcementId).delete();
}

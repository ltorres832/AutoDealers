"use strict";
// Sistema de notificaciones
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
exports.createNotification = createNotification;
exports.getUserNotifications = getUserNotifications;
exports.markNotificationAsRead = markNotificationAsRead;
exports.getNotificationChannelsForUser = getNotificationChannelsForUser;
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
exports.notifyManagersAndAdmins = notifyManagersAndAdmins;
const shared_1 = require("@autodealers/shared");
const messaging_1 = require("@autodealers/messaging");
const messaging_2 = require("@autodealers/messaging");
const messaging_3 = require("@autodealers/messaging");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea una notificación
 */
async function createNotification(notification) {
    const db = getDb();
    const docRef = getDb().collection('tenants')
        .doc(notification.tenantId)
        .collection('notifications')
        .doc();
    const notificationData = {
        ...notification,
        read: false,
        createdAt: (0, shared_1.getFirestoreFieldValue)().serverTimestamp(),
    };
    await docRef.set(notificationData);
    // Enviar por canales configurados
    await sendNotificationChannels(notification);
    return {
        id: docRef.id,
        ...notification,
        read: false,
        createdAt: new Date(),
    };
}
/**
 * Envía notificación por los canales configurados
 */
async function sendNotificationChannels(notification) {
    // Obtener configuración de notificaciones del usuario
    const userDoc = await getDb().collection('users').doc(notification.userId).get();
    const userData = userDoc.data();
    const userSettings = userData?.settings?.notifications || {};
    for (const channel of notification.channels) {
        if (userSettings[channel] === false) {
            continue; // Usuario deshabilitó este canal
        }
        try {
            switch (channel) {
                case 'email':
                    await sendEmailNotification(notification);
                    break;
                case 'sms':
                    await sendSMSNotification(notification);
                    break;
                case 'whatsapp':
                    await sendWhatsAppNotification(notification);
                    break;
                // 'system' se guarda automáticamente en Firestore
            }
        }
        catch (error) {
            console.error(`Error sending ${channel} notification:`, error);
        }
    }
}
/**
 * Envía notificación por email
 */
async function sendEmailNotification(notification) {
    const userDoc = await getDb().collection('users').doc(notification.userId).get();
    const userData = userDoc.data();
    const email = userData?.email;
    if (!email) {
        return;
    }
    // Obtener credenciales de email desde Firestore
    const { getEmailCredentials } = await Promise.resolve().then(() => __importStar(require('./credentials')));
    const emailCreds = await getEmailCredentials();
    const emailApiKey = emailCreds.apiKey || '';
    if (!emailApiKey) {
        console.warn('Email API Key no configurada. No se enviará email.');
        return;
    }
    const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_') ? 'resend' : 'sendgrid';
    const emailService = new messaging_1.EmailService(emailApiKey, emailProvider);
    await emailService.sendEmail({
        tenantId: notification.tenantId,
        channel: 'email',
        direction: 'outbound',
        from: emailCreds.fromAddress || 'noreply@autodealers.com',
        to: email,
        content: `
      <h2>${notification.title}</h2>
      <p>${notification.message}</p>
    `,
        metadata: {
            subject: notification.title,
        },
    });
}
/**
 * Envía notificación por SMS
 */
async function sendSMSNotification(notification) {
    const userDoc = await getDb().collection('users').doc(notification.userId).get();
    const userData = userDoc.data();
    const phone = userData?.phone;
    if (!phone) {
        return;
    }
    // Obtener credenciales de Twilio desde Firestore
    const { getTwilioCredentials } = await Promise.resolve().then(() => __importStar(require('./credentials')));
    const twilioCreds = await getTwilioCredentials();
    if (!twilioCreds.accountSid || !twilioCreds.authToken || !twilioCreds.phoneNumber) {
        console.warn('Credenciales de Twilio no configuradas. No se enviará SMS.');
        return;
    }
    const smsService = new messaging_2.SMSService(twilioCreds.accountSid, twilioCreds.authToken, twilioCreds.phoneNumber);
    await smsService.sendSMS({
        tenantId: notification.tenantId,
        channel: 'sms',
        direction: 'outbound',
        from: twilioCreds.phoneNumber,
        to: phone,
        content: `${notification.title}: ${notification.message}`,
    });
}
/**
 * Envía notificación por WhatsApp
 */
async function sendWhatsAppNotification(notification) {
    const userDoc = await getDb().collection('users').doc(notification.userId).get();
    const userData = userDoc.data();
    const phone = userData?.phone;
    if (!phone) {
        return;
    }
    // Obtener credenciales de WhatsApp desde Firestore
    const { getWhatsAppCredentials } = await Promise.resolve().then(() => __importStar(require('./credentials')));
    const whatsappCreds = await getWhatsAppCredentials();
    const whatsappService = new messaging_3.WhatsAppService(whatsappCreds.accessToken || '', whatsappCreds.phoneNumberId || '');
    await whatsappService.sendMessage({
        tenantId: notification.tenantId,
        channel: 'whatsapp',
        direction: 'outbound',
        from: whatsappCreds.phoneNumberId || '',
        to: phone,
        content: `${notification.title}\n\n${notification.message}`,
    });
}
/**
 * Obtiene notificaciones de un usuario
 */
async function getUserNotifications(tenantId, userId, options) {
    try {
        let query = getDb()
            .collection('tenants')
            .doc(tenantId)
            .collection('notifications')
            .where('userId', '==', userId);
        if (options?.unreadOnly) {
            query = query.where('read', '==', false);
        }
        // Intentar ordenar por createdAt, pero si falla por falta de índice, obtener sin ordenar
        try {
            query = query.orderBy('createdAt', 'desc');
        }
        catch (orderError) {
            // Si falla el orderBy por falta de índice, continuar sin ordenar
            console.warn('⚠️ No se pudo ordenar notificaciones por createdAt (índice faltante), obteniendo sin ordenar:', orderError.message);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        const snapshot = await query.get();
        const notifications = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data?.createdAt?.toDate() || new Date(),
                readAt: data?.readAt?.toDate(),
            };
        });
        // Ordenar manualmente si no se pudo ordenar en la consulta
        if (notifications.length > 0 && notifications[0].createdAt) {
            notifications.sort((a, b) => {
                const aTime = a.createdAt.getTime();
                const bTime = b.createdAt.getTime();
                return bTime - aTime; // Descendente
            });
        }
        return notifications;
    }
    catch (error) {
        // Si el error es por índice faltante, intentar obtener sin orderBy
        if (error.code === 9 || error.message?.includes('index')) {
            console.warn('⚠️ Índice faltante en Firestore para notificaciones. Obteniendo sin orderBy...');
            try {
                let query = getDb()
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('notifications')
                    .where('userId', '==', userId);
                if (options?.unreadOnly) {
                    query = query.where('read', '==', false);
                }
                if (options?.limit) {
                    query = query.limit(options.limit);
                }
                const snapshot = await query.get();
                const notifications = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data?.createdAt?.toDate() || new Date(),
                        readAt: data?.readAt?.toDate(),
                    };
                });
                // Ordenar manualmente
                notifications.sort((a, b) => {
                    const aTime = a.createdAt.getTime();
                    const bTime = b.createdAt.getTime();
                    return bTime - aTime; // Descendente
                });
                return notifications;
            }
            catch (fallbackError) {
                console.error('❌ Error al obtener notificaciones (fallback):', fallbackError);
                return [];
            }
        }
        console.error('❌ Error al obtener notificaciones:', error);
        throw error;
    }
}
/**
 * Marca una notificación como leída
 */
async function markNotificationAsRead(tenantId, notificationId) {
    const db = getDb();
    await getDb().collection('tenants')
        .doc(tenantId)
        .collection('notifications')
        .doc(notificationId)
        .update({
        read: true,
        readAt: (0, shared_1.getFirestoreFieldValue)().serverTimestamp(),
    });
}
/**
 * Canales de notificación para un usuario (respeta `settings.notifications` y teléfono).
 * Usado al notificar vendedores asignados (email / SMS / WhatsApp según preferencias).
 */
async function getNotificationChannelsForUser(userId) {
    const userDoc = await getDb().collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) {
        return ['system'];
    }
    const userNotificationSettings = userData?.settings?.notifications || {};
    const channels = ['system'];
    if (userNotificationSettings.email !== false) {
        channels.push('email');
    }
    if (userData.phone) {
        if (userNotificationSettings.sms !== false) {
            channels.push('sms');
        }
        if (userNotificationSettings.whatsapp !== false) {
            channels.push('whatsapp');
        }
    }
    return channels;
}
/**
 * Marca todas las notificaciones como leídas
 */
async function markAllNotificationsAsRead(tenantId, userId) {
    const db = getDb();
    const batch = getDb().batch();
    const snapshot = await getDb().collection('tenants')
        .doc(tenantId)
        .collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
            read: true,
            readAt: (0, shared_1.getFirestoreFieldValue)().serverTimestamp(),
        });
    });
    await batch.commit();
}
/**
 * Notifica automáticamente a gerentes y administradores sobre eventos del negocio
 */
async function notifyManagersAndAdmins(tenantId, notification, options) {
    try {
        const db = getDb();
        // Gerentes, admins y titulares dealer del tenant (evitar que solo managers reciban todo)
        const managersSnapshot = await getDb().collection('users')
            .where('tenantId', '==', tenantId)
            .where('role', 'in', ['manager', 'dealer_admin', 'dealer', 'master_dealer'])
            .where('status', '==', 'active')
            .get();
        if (managersSnapshot.empty) {
            return; // No hay gerentes o administradores para notificar
        }
        // Enviar notificación a cada gerente/administrador
        const notificationPromises = managersSnapshot.docs.map(async (doc) => {
            const userData = doc.data();
            const userId = doc.id;
            if (options?.excludeUserIds?.includes(userId)) {
                return;
            }
            // Verificar configuración de notificaciones del usuario
            const businessNotifications = userData?.settings?.businessNotifications || {};
            // Verificar si el usuario quiere recibir este tipo de notificación
            let shouldNotify = true;
            switch (notification.type) {
                case 'lead_created':
                case 'lead_assigned':
                    shouldNotify = businessNotifications.newLeads !== false;
                    break;
                case 'message_received':
                    shouldNotify = businessNotifications.newMessages !== false;
                    break;
                case 'appointment_created':
                case 'appointment_confirmed':
                case 'appointment_reminder':
                    shouldNotify = businessNotifications.newAppointments !== false;
                    break;
                case 'sale_completed':
                    shouldNotify = businessNotifications.newSales !== false;
                    break;
                case 'system_alert':
                    shouldNotify = businessNotifications.systemAlerts !== false;
                    break;
                default:
                    shouldNotify = true;
            }
            if (!shouldNotify) {
                return; // Usuario deshabilitó este tipo de notificación
            }
            // Determinar canales según configuración del usuario
            const userNotificationSettings = userData?.settings?.notifications || {};
            const channels = ['system']; // Siempre notificar en sistema
            if (userNotificationSettings.email !== false) {
                channels.push('email');
            }
            if (userData.phone) {
                if (userNotificationSettings.sms !== false) {
                    channels.push('sms');
                }
                if (userNotificationSettings.whatsapp !== false) {
                    channels.push('whatsapp');
                }
            }
            // Crear y enviar notificación
            await createNotification({
                tenantId,
                userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                channels,
                metadata: notification.metadata,
            });
        });
        await Promise.all(notificationPromises);
    }
    catch (error) {
        console.error('Error notifying managers and admins:', error);
        // No lanzar error para no interrumpir el flujo principal
    }
}

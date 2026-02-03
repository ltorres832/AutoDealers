// Sistema de notificaciones

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';
import { EmailService } from '@autodealers/messaging';
import { SMSService } from '@autodealers/messaging';
import { WhatsAppService } from '@autodealers/messaging';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export type NotificationType =
  | 'lead_created'
  | 'lead_assigned'
  | 'message_received'
  | 'appointment_created'
  | 'appointment_reminder'
  | 'sale_completed'
  | 'reminder_due'
  | 'payment_failed'
  | 'system_alert';

export type NotificationChannel = 'system' | 'email' | 'sms' | 'whatsapp';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
}

/**
 * Crea una notificación
 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<Notification> {
  const db = getDb();
  const docRef = getDb().collection('tenants')
    .doc(notification.tenantId)
    .collection('notifications')
    .doc();

  const notificationData = {
    ...notification,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.set(notificationData as any);

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
async function sendNotificationChannels(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<void> {
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
    } catch (error) {
      console.error(`Error sending ${channel} notification:`, error);
    }
  }
}

/**
 * Envía notificación por email
 */
async function sendEmailNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<void> {
  const userDoc = await getDb().collection('users').doc(notification.userId).get();
  const userData = userDoc.data();
  const email = userData?.email;

  if (!email) {
    return;
  }

  // Obtener credenciales de email desde Firestore
  const { getEmailCredentials } = await import('./credentials');
  const emailCreds = await getEmailCredentials();
  const emailApiKey = emailCreds.apiKey || '';
  
  if (!emailApiKey) {
    console.warn('Email API Key no configurada. No se enviará email.');
    return;
  }
  
  const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_') ? 'resend' : 'sendgrid';
  
  const emailService = new EmailService(
    emailApiKey,
    emailProvider
  );

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
async function sendSMSNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<void> {
  const userDoc = await getDb().collection('users').doc(notification.userId).get();
  const userData = userDoc.data();
  const phone = userData?.phone;

  if (!phone) {
    return;
  }

  // Obtener credenciales de Twilio desde Firestore
  const { getTwilioCredentials } = await import('./credentials');
  const twilioCreds = await getTwilioCredentials();
  
  if (!twilioCreds.accountSid || !twilioCreds.authToken || !twilioCreds.phoneNumber) {
    console.warn('Credenciales de Twilio no configuradas. No se enviará SMS.');
    return;
  }
  
  const smsService = new SMSService(
    twilioCreds.accountSid,
    twilioCreds.authToken,
    twilioCreds.phoneNumber
  );

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
async function sendWhatsAppNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<void> {
  const userDoc = await getDb().collection('users').doc(notification.userId).get();
  const userData = userDoc.data();
  const phone = userData?.phone;

  if (!phone) {
    return;
  }

  // Obtener credenciales de WhatsApp desde Firestore
  const { getWhatsAppCredentials } = await import('./credentials');
  const whatsappCreds = await getWhatsAppCredentials();
  
  const whatsappService = new WhatsAppService(
    whatsappCreds.accessToken || '',
    whatsappCreds.phoneNumberId || ''
  );

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
export async function getUserNotifications(
  tenantId: string,
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
  }
): Promise<Notification[]> {
  try {
    let query: admin.firestore.Query = getDb()
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
    } catch (orderError: any) {
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
      } as Notification;
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
  } catch (error: any) {
    // Si el error es por índice faltante, intentar obtener sin orderBy
    if (error.code === 9 || error.message?.includes('index')) {
      console.warn('⚠️ Índice faltante en Firestore para notificaciones. Obteniendo sin orderBy...');
      try {
        let query: admin.firestore.Query = getDb()
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
          } as Notification;
        });

        // Ordenar manualmente
        notifications.sort((a, b) => {
          const aTime = a.createdAt.getTime();
          const bTime = b.createdAt.getTime();
          return bTime - aTime; // Descendente
        });

        return notifications;
      } catch (fallbackError: any) {
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
export async function markNotificationAsRead(
  tenantId: string,
  notificationId: string
): Promise<void> {
  const db = getDb();
  await getDb().collection('tenants')
    .doc(tenantId)
    .collection('notifications')
    .doc(notificationId)
    .update({
      read: true,
      readAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

/**
 * Marca todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead(
  tenantId: string,
  userId: string
): Promise<void> {
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
      readAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
  });

  await batch.commit();
}

/**
 * Notifica automáticamente a gerentes y administradores sobre eventos del negocio
 */
export async function notifyManagersAndAdmins(
  tenantId: string,
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const db = getDb();
    
    // Buscar todos los usuarios manager y dealer_admin del tenant
    const managersSnapshot = await getDb().collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', 'in', ['manager', 'dealer_admin'])
      .where('status', '==', 'active')
      .get();

    if (managersSnapshot.empty) {
      return; // No hay gerentes o administradores para notificar
    }

    // Enviar notificación a cada gerente/administrador
    const notificationPromises = managersSnapshot.docs.map(async (doc) => {
      const userData = doc.data();
      const userId = doc.id;
      
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
      const channels: NotificationChannel[] = ['system']; // Siempre notificar en sistema
      
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
  } catch (error) {
    console.error('Error notifying managers and admins:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}






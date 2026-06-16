// Sistema de notificaciones

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { EmailService } from '@autodealers/messaging';
import { SMSService } from '@autodealers/messaging';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export type NotificationType =
  | 'lead_created'
  | 'lead_assigned'
  | 'message_received'
  | 'public_chat'
  | 'internal_chat'
  | 'document_uploaded'
  | 'document_signed'
  | 'task_assigned'
  | 'task_due'
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_reminder'
  | 'sale_completed'
  | 'reminder_due'
  | 'payment_failed'
  | 'promotion'
  | 'announcement'
  | 'fi_request'
  | 'catalog_interest'
  | 'system_alert';

export type NotificationChannel = 'system' | 'push' | 'email' | 'sms' | 'whatsapp';

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
    createdAt: getFirestoreFieldValue().serverTimestamp(),
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
        case 'push':
          await sendPushNotification(notification);
          break;
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
 * Envía notificación push (FCM)
 */
async function sendPushNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<void> {
  const { sendPushToUser } = await import('./fcm-tokens');
  const route =
    typeof notification.metadata?.route === 'string'
      ? notification.metadata.route
      : notification.metadata?.leadId
        ? `/leads?leadId=${notification.metadata.leadId}`
        : notification.metadata?.messageId
          ? '/messages'
          : '/';

  await sendPushToUser(notification.userId, {
    title: notification.title,
    body: notification.message,
    data: {
      type: notification.type,
      tenantId: notification.tenantId,
      route,
      ...(notification.metadata
        ? Object.fromEntries(
            Object.entries(notification.metadata).map(([k, v]) => [k, String(v ?? '')])
          )
        : {}),
    },
  });
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

  const { createWhatsAppServiceForTenant } = await import('./messaging-outbound');
  const wa = await createWhatsAppServiceForTenant(notification.tenantId);

  if (!wa) {
    console.warn('WhatsApp not configured for tenant', notification.tenantId);
    return;
  }

  await wa.service.sendMessage({
    tenantId: notification.tenantId,
    channel: 'whatsapp',
    direction: 'outbound',
    from: wa.phoneNumberId,
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
      readAt: getFirestoreFieldValue().serverTimestamp(),
    } as any);
}

/**
 * Canales de notificación para un usuario (respeta `settings.notifications` y teléfono).
 * Usado al notificar vendedores asignados (email / SMS / WhatsApp según preferencias).
 */
export async function getNotificationChannelsForUser(userId: string): Promise<NotificationChannel[]> {
  const userDoc = await getDb().collection('users').doc(userId).get();
  const userData = userDoc.data();
  if (!userData) {
    return ['system'];
  }
  const userNotificationSettings = userData?.settings?.notifications || {};
  const channels: NotificationChannel[] = ['system'];
  if (userNotificationSettings.push !== false) {
    channels.push('push');
  }
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
 * Notifica a un usuario con todos los canales según sus preferencias.
 */
export async function notifyUser(
  tenantId: string,
  userId: string,
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
    channels?: NotificationChannel[];
  }
): Promise<Notification> {
  const channels =
    notification.channels || (await getNotificationChannelsForUser(userId));
  return createNotification({
    tenantId,
    userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    channels,
    metadata: notification.metadata,
  });
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
      readAt: getFirestoreFieldValue().serverTimestamp(),
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
  },
  options?: { excludeUserIds?: string[] }
): Promise<void> {
  try {
    const db = getDb();
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantType = tenantDoc.data()?.type as string | undefined;

    // Vendedor independiente: tenant type seller → notificar al titular (role seller).
    // Concesionario: gerentes, dealer_admin, dealer, master_dealer.
    const recipientRoles =
      tenantType === 'seller'
        ? ['seller']
        : ['manager', 'dealer_admin', 'dealer', 'master_dealer', 'fi_manager'];

    const managersSnapshot = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', 'in', recipientRoles)
      .where('status', '==', 'active')
      .get();

    if (managersSnapshot.empty) {
      return;
    }

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
        case 'public_chat':
        case 'internal_chat':
          shouldNotify = businessNotifications.newMessages !== false;
          break;
        case 'document_uploaded':
        case 'document_signed':
        case 'fi_request':
          shouldNotify = businessNotifications.documents !== false;
          break;
        case 'task_assigned':
        case 'task_due':
          shouldNotify = businessNotifications.tasks !== false;
          break;
        case 'appointment_created':
        case 'appointment_confirmed':
        case 'appointment_reminder':
          shouldNotify = businessNotifications.newAppointments !== false;
          break;
        case 'sale_completed':
          shouldNotify = businessNotifications.newSales !== false;
          break;
        case 'catalog_interest':
          shouldNotify = businessNotifications.catalogInterest !== false;
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
      const channels: NotificationChannel[] = ['system'];

      if (userNotificationSettings.push !== false) {
        channels.push('push');
      }
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

/**
 * Notifica a todos los usuarios admin de plataforma (sin tenant operativo).
 * Se almacenan en tenants/_platform/notifications.
 */
export async function notifyPlatformAdmins(notification: {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const { PLATFORM_ADMIN_TENANT_ID } = await import('./platform-social');
    const db = getDb();
    const adminsSnapshot = await db
      .collection('users')
      .where('role', '==', 'admin')
      .get();

    if (adminsSnapshot.empty) return;

    await Promise.all(
      adminsSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        const channels = await getNotificationChannelsForUser(doc.id);
        await createNotification({
          tenantId: PLATFORM_ADMIN_TENANT_ID,
          userId: doc.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          channels,
          metadata: notification.metadata,
        });
        void userData;
      })
    );
  } catch (error) {
    console.error('Error notifying platform admins:', error);
  }
}

/** Marca como leídas las notificaciones de admin de plataforma que coinciden con metadata. */
export async function markPlatformAdminNotificationsRead(
  metadataFilter: Record<string, string>
): Promise<void> {
  try {
    const { PLATFORM_ADMIN_TENANT_ID } = await import('./platform-social');
    const db = getDb();
    const entries = Object.entries(metadataFilter);
    if (entries.length === 0) return;

    let q: any = db
      .collection('tenants')
      .doc(PLATFORM_ADMIN_TENANT_ID)
      .collection('notifications')
      .where('read', '==', false);

    for (const [key, value] of entries) {
      q = q.where(`metadata.${key}`, '==', value);
    }

    const snapshot = await q.get();
    if (snapshot.empty) return;

    const batch = db.batch();
    const readAt = getFirestoreFieldValue().serverTimestamp();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true, readAt } as any);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error marking platform admin notifications read:', error);
  }
}






// Cloud Functions para Notificaciones
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { createNotification, getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@autodealers/core';

const db = getFirestore();

// Crear notificación
export const createNotificationFunction = onCall(async (request) => {
  const { tenantId, userId, type, title, message, channels, metadata } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !userId || !type || !title || !message) {
    throw new HttpsError('invalid-argument', 'tenantId, userId, type, title y message son requeridos');
  }

  try {
    const notification = await createNotification({
      tenantId,
      userId,
      type,
      title,
      message,
      channels: channels || ['system'],
      metadata,
    });

    return { notification };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear notificación: ${error.message}`);
  }
});

// Obtener notificaciones del usuario
export const getUserNotificationsFunction = onCall(async (request) => {
  const { tenantId, userId, unreadOnly, limit } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !userId) {
    throw new HttpsError('invalid-argument', 'tenantId y userId son requeridos');
  }

  try {
    const notifications = await getUserNotifications(tenantId, userId, {
      unreadOnly,
      limit,
    });

    return { notifications };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener notificaciones: ${error.message}`);
  }
});

// Marcar notificación como leída
export const markNotificationAsReadFunction = onCall(async (request) => {
  const { tenantId, notificationId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !notificationId) {
    throw new HttpsError('invalid-argument', 'tenantId y notificationId son requeridos');
  }

  try {
    await markNotificationAsRead(tenantId, notificationId);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al marcar notificación como leída: ${error.message}`);
  }
});

// Marcar todas las notificaciones como leídas
export const markAllNotificationsAsReadFunction = onCall(async (request) => {
  const { tenantId, userId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !userId) {
    throw new HttpsError('invalid-argument', 'tenantId y userId son requeridos');
  }

  try {
    await markAllNotificationsAsRead(tenantId, userId);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al marcar todas las notificaciones como leídas: ${error.message}`);
  }
});



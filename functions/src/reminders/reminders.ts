// Cloud Functions para Reminders
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import {
  createReminder,
  createPostSaleReminders,
  getPendingReminders,
  markReminderAsSent,
  getReminders,
} from '@autodealers/crm';

const db = getFirestore();

// Crear recordatorio
export const createReminderFunction = onCall(async (request) => {
  const { reminderData } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!reminderData) {
    throw new HttpsError('invalid-argument', 'reminderData es requerido');
  }

  try {
    const reminder = await createReminder(reminderData);
    return { reminder };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear recordatorio: ${error.message}`);
  }
});

// Crear recordatorios post-venta
export const createPostSaleRemindersFunction = onCall(async (request) => {
  const { tenantId, saleId, customerId, vehicleId, selectedReminders } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !saleId || !customerId || !vehicleId) {
    throw new HttpsError('invalid-argument', 'tenantId, saleId, customerId y vehicleId son requeridos');
  }

  try {
    const reminders = await createPostSaleReminders(
      tenantId,
      saleId,
      customerId,
      vehicleId,
      selectedReminders
    );
    return { reminders };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear recordatorios post-venta: ${error.message}`);
  }
});

// Obtener recordatorios pendientes
export const getPendingRemindersFunction = onCall(async (request) => {
  const { tenantId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const reminders = await getPendingReminders(tenantId);
    return { reminders };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener recordatorios pendientes: ${error.message}`);
  }
});

// Obtener recordatorios
export const getRemindersFunction = onCall(async (request) => {
  const { tenantId, filters } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const reminders = await getReminders(tenantId, filters);
    return { reminders };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener recordatorios: ${error.message}`);
  }
});

// Marcar recordatorio como enviado
export const markReminderAsSentFunction = onCall(async (request) => {
  const { tenantId, reminderId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !reminderId) {
    throw new HttpsError('invalid-argument', 'tenantId y reminderId son requeridos');
  }

  try {
    await markReminderAsSent(tenantId, reminderId);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al marcar recordatorio como enviado: ${error.message}`);
  }
});

// Actualizar recordatorio
export const updateReminder = onCall(async (request) => {
  const { tenantId, reminderId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !reminderId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, reminderId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('post_sale_reminders')
      .doc(reminderId)
      .update(updates);

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar recordatorio: ${error.message}`);
  }
});

// Cancelar recordatorio
export const cancelReminder = onCall(async (request) => {
  const { tenantId, reminderId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !reminderId) {
    throw new HttpsError('invalid-argument', 'tenantId y reminderId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('post_sale_reminders')
      .doc(reminderId)
      .update({
        status: 'cancelled',
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al cancelar recordatorio: ${error.message}`);
  }
});



// Cloud Functions para Appointments
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Obtener citas del tenant
export const getAppointments = onCall(async (request) => {
  const { tenantId, leadId, assignedTo, status } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    let query = db
      .collection('tenants')
      .doc(tenantId)
      .collection('appointments') as any;

    if (leadId) {
      query = query.where('leadId', '==', leadId);
    }
    if (assignedTo) {
      query = query.where('assignedTo', '==', assignedTo);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('scheduledAt', 'asc').limit(100);

    const snapshot = await query.get();
    const appointments = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { appointments };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener citas: ${error.message}`);
  }
});

// Crear cita
export const createAppointment = onCall(async (request) => {
  const { tenantId, appointment } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !appointment) {
    throw new HttpsError('invalid-argument', 'tenantId y appointment son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('appointments')
      .doc();

    await docRef.set({
      ...appointment,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear cita: ${error.message}`);
  }
});

// Actualizar cita
export const updateAppointment = onCall(async (request) => {
  const { tenantId, appointmentId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !appointmentId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, appointmentId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('appointments')
      .doc(appointmentId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar cita: ${error.message}`);
  }
});



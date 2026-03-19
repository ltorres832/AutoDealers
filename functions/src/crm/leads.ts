// Cloud Functions para CRM - Leads
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Obtener leads del tenant
export const getLeads = onCall(async (request) => {
  const { tenantId, status, assignedTo, source } = request.data;
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
      .collection('leads') as any;

    if (status) {
      query = query.where('status', '==', status);
    }
    if (assignedTo) {
      query = query.where('assignedTo', '==', assignedTo);
    }
    if (source) {
      query = query.where('source', '==', source);
    }

    query = query.orderBy('createdAt', 'desc').limit(50);

    const snapshot = await query.get();
    const leads = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { leads };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener leads: ${error.message}`);
  }
});

// Crear un nuevo lead
export const createLead = onCall(async (request) => {
  const { tenantId, lead } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !lead) {
    throw new HttpsError('invalid-argument', 'tenantId y lead son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .doc();

    await docRef.set({
      ...lead,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear lead: ${error.message}`);
  }
});

// Actualizar un lead
export const updateLead = onCall(async (request) => {
  const { tenantId, leadId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !leadId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, leadId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .doc(leadId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar lead: ${error.message}`);
  }
});

// Eliminar un lead
export const deleteLead = onCall(async (request) => {
  const { tenantId, leadId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !leadId) {
    throw new HttpsError('invalid-argument', 'tenantId y leadId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .doc(leadId)
      .delete();

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al eliminar lead: ${error.message}`);
  }
});



// Cloud Functions para Workflows
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Crear workflow
export const createWorkflow = onCall(async (request) => {
  const { tenantId, workflow } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !workflow) {
    throw new HttpsError('invalid-argument', 'tenantId y workflow son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows')
      .doc();

    await docRef.set({
      ...workflow,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear workflow: ${error.message}`);
  }
});

// Obtener workflows
export const getWorkflows = onCall(async (request) => {
  const { tenantId, status } = request.data;
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
      .collection('workflows') as any;

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc').limit(100);

    const snapshot = await query.get();
    const workflows = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { workflows };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener workflows: ${error.message}`);
  }
});

// Actualizar workflow
export const updateWorkflow = onCall(async (request) => {
  const { tenantId, workflowId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !workflowId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, workflowId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows')
      .doc(workflowId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar workflow: ${error.message}`);
  }
});

// Eliminar workflow
export const deleteWorkflow = onCall(async (request) => {
  const { tenantId, workflowId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !workflowId) {
    throw new HttpsError('invalid-argument', 'tenantId y workflowId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('workflows')
      .doc(workflowId)
      .delete();

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al eliminar workflow: ${error.message}`);
  }
});



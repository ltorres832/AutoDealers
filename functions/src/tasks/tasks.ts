// Cloud Functions para Tasks
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Crear task
export const createTask = onCall(async (request) => {
  const { tenantId, task } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !task) {
    throw new HttpsError('invalid-argument', 'tenantId y task son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('tasks')
      .doc();

    await docRef.set({
      ...task,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear task: ${error.message}`);
  }
});

// Obtener tasks
export const getTasks = onCall(async (request) => {
  const { tenantId, assignedTo, completed, limit } = request.data;
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
      .collection('tasks') as any;

    if (assignedTo) {
      query = query.where('assignedTo', '==', assignedTo);
    }
    if (completed != null) {
      query = query.where('completed', '==', completed);
    }

    query = query.orderBy('createdAt', 'desc').limit(limit || 100);

    const snapshot = await query.get();
    const tasks = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { tasks };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener tasks: ${error.message}`);
  }
});

// Actualizar task
export const updateTask = onCall(async (request) => {
  const { tenantId, taskId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !taskId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, taskId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('tasks')
      .doc(taskId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar task: ${error.message}`);
  }
});

// Completar task
export const completeTask = onCall(async (request) => {
  const { tenantId, taskId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !taskId) {
    throw new HttpsError('invalid-argument', 'tenantId y taskId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('tasks')
      .doc(taskId)
      .update({
        completed: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al completar task: ${error.message}`);
  }
});

// Eliminar task
export const deleteTask = onCall(async (request) => {
  const { tenantId, taskId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !taskId) {
    throw new HttpsError('invalid-argument', 'tenantId y taskId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('tasks')
      .doc(taskId)
      .delete();

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al eliminar task: ${error.message}`);
  }
});



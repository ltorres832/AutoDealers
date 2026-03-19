/**
 * Cloud Functions para Email Aliases
 * 
 * Funcionalidades:
 * - Obtener aliases de email
 * - Crear/actualizar/eliminar aliases
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Obtener aliases de email
 */
export const getEmailAliases = onCall(async (request) => {
  const { dealerId, assignedTo } = request.data;
  const authToken = request.auth?.token;

  if (!authToken) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  let query: FirebaseFirestore.Query = db.collection('email_aliases');

  if (dealerId) {
    query = query.where('dealerId', '==', dealerId);
  }
  if (assignedTo) {
    query = query.where('assignedTo', '==', assignedTo);
  }

  const snapshot = await query.get();
  const aliases = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  });

  return { aliases };
});

/**
 * Crear alias de email
 */
export const createEmailAlias = onCall(async (request) => {
  const { alias, dealerId, assignedTo, forwardTo } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !alias || !dealerId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const aliasRef = db.collection('email_aliases').doc();
  await aliasRef.set({
    alias,
    dealerId,
    assignedTo: assignedTo || null,
    forwardTo: forwardTo || null,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const createdDoc = await aliasRef.get();
  const createdData = createdDoc.data()!;

  return {
    id: aliasRef.id,
    ...createdData,
    createdAt: createdData.createdAt?.toDate?.() || createdData.createdAt,
    updatedAt: createdData.updatedAt?.toDate?.() || createdData.updatedAt,
  };
});

/**
 * Actualizar alias de email
 */
export const updateEmailAlias = onCall(async (request) => {
  const { aliasId, updates } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !aliasId || !updates) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const aliasRef = db.collection('email_aliases').doc(aliasId);
  await aliasRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await aliasRef.get();
  const updatedData = updatedDoc.data()!;

  return {
    id: aliasRef.id,
    ...updatedData,
    createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
    updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
  };
});

/**
 * Eliminar alias de email
 */
export const deleteEmailAlias = onCall(async (request) => {
  const { aliasId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !aliasId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  await db.collection('email_aliases').doc(aliasId).delete();

  return { success: true };
});



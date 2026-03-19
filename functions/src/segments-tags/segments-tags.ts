/**
 * Cloud Functions para Segments y Tags
 * 
 * Funcionalidades:
 * - Gestión de segmentos
 * - Gestión de tags
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

// ==================== Segments ====================

/**
 * Obtener segmentos
 */
export const getSegments = onCall(async (request) => {
  const { tenantId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('segments')
    .get();

  const segments = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  });

  return { segments };
});

/**
 * Crear segmento
 */
export const createSegment = onCall(async (request) => {
  const { tenantId, segment } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !segment) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const segmentRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('segments')
    .doc();

  await segmentRef.set({
    ...segment,
    tenantId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const createdDoc = await segmentRef.get();
  const createdData = createdDoc.data()!;

  return {
    id: segmentRef.id,
    ...createdData,
    createdAt: createdData.createdAt?.toDate?.() || createdData.createdAt,
    updatedAt: createdData.updatedAt?.toDate?.() || createdData.updatedAt,
  };
});

/**
 * Actualizar segmento
 */
export const updateSegment = onCall(async (request) => {
  const { tenantId, segmentId, updates } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !segmentId || !updates) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const segmentRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('segments')
    .doc(segmentId);

  await segmentRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await segmentRef.get();
  const updatedData = updatedDoc.data()!;

  return {
    id: segmentRef.id,
    ...updatedData,
    createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
    updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
  };
});

/**
 * Eliminar segmento
 */
export const deleteSegment = onCall(async (request) => {
  const { tenantId, segmentId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !segmentId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('segments')
    .doc(segmentId)
    .delete();

  return { success: true };
});

// ==================== Tags ====================

/**
 * Obtener tags
 */
export const getTags = onCall(async (request) => {
  const { tenantId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('tags')
    .get();

  const tags = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  });

  return { tags };
});

/**
 * Crear tag
 */
export const createTag = onCall(async (request) => {
  const { tenantId, tag } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !tag) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const tagRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('tags')
    .doc();

  await tagRef.set({
    ...tag,
    tenantId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const createdDoc = await tagRef.get();
  const createdData = createdDoc.data()!;

  return {
    id: tagRef.id,
    ...createdData,
    createdAt: createdData.createdAt?.toDate?.() || createdData.createdAt,
    updatedAt: createdData.updatedAt?.toDate?.() || createdData.updatedAt,
  };
});

/**
 * Actualizar tag
 */
export const updateTag = onCall(async (request) => {
  const { tenantId, tagId, updates } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !tagId || !updates) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const tagRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('tags')
    .doc(tagId);

  await tagRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await tagRef.get();
  const updatedData = updatedDoc.data()!;

  return {
    id: tagRef.id,
    ...updatedData,
    createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
    updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
  };
});

/**
 * Eliminar tag
 */
export const deleteTag = onCall(async (request) => {
  const { tenantId, tagId } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !tagId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('tags')
    .doc(tagId)
    .delete();

  return { success: true };
});



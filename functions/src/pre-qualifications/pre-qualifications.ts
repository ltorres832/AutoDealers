/**
 * Cloud Functions para Pre-Qualifications
 * 
 * Funcionalidades:
 * - Obtener pre-cualificaciones
 * - Crear/actualizar pre-cualificaciones
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Obtener pre-cualificaciones
 */
export const getPreQualifications = onCall(async (request) => {
  const { tenantId, status, limit } = request.data;
  const authToken = request.auth?.token;

  if (!authToken) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  let query: FirebaseFirestore.Query = db
    .collection('tenants')
    .doc(tenantId!)
    .collection('pre_qualifications');

  if (status) {
    query = query.where('status', '==', status);
  }

  if (limit) {
    query = query.limit(limit);
  }

  try {
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const preQualifications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });
    return { preQualifications };
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      const snapshot = await query.get();
      const preQualifications = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        };
      });
      preQualifications.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
      return { preQualifications };
    }
    throw new HttpsError('internal', `Error al obtener pre-cualificaciones: ${error.message}`);
  }
});

/**
 * Crear pre-cualificación
 */
export const createPreQualification = onCall(async (request) => {
  const { tenantId, clientInfo, vehicleInfo, financialInfo, status } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !clientInfo) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const preQualRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('pre_qualifications')
    .doc();

  await preQualRef.set({
    tenantId,
    clientInfo,
    vehicleInfo: vehicleInfo || {},
    financialInfo: financialInfo || {},
    status: status || 'pending',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const createdDoc = await preQualRef.get();
  const createdData = createdDoc.data()!;

  return {
    id: preQualRef.id,
    ...createdData,
    createdAt: createdData.createdAt?.toDate?.() || createdData.createdAt,
    updatedAt: createdData.updatedAt?.toDate?.() || createdData.updatedAt,
  };
});

/**
 * Actualizar pre-cualificación
 */
export const updatePreQualification = onCall(async (request) => {
  const { tenantId, preQualificationId, updates } = request.data;
  const authToken = request.auth?.token;

  if (!authToken || !tenantId || !preQualificationId || !updates) {
    throw new HttpsError('invalid-argument', 'Datos incompletos');
  }

  const preQualRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('pre_qualifications')
    .doc(preQualificationId);

  await preQualRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await preQualRef.get();
  const updatedData = updatedDoc.data()!;

  return {
    id: preQualRef.id,
    ...updatedData,
    createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
    updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt,
  };
});



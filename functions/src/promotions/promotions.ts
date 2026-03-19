// Cloud Functions para Promotions
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { createPromotion, getActivePromotions, getPromotions, sendPromotionToLeads } from '@autodealers/core';

const db = getFirestore();

// Crear promoción
export const createPromotionFunction = onCall(async (request) => {
  const { promotion } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!promotion) {
    throw new HttpsError('invalid-argument', 'promotion es requerido');
  }

  try {
    const newPromotion = await createPromotion(promotion);
    return { promotion: newPromotion };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear promoción: ${error.message}`);
  }
});

// Obtener promociones activas
export const getActivePromotionsFunction = onCall(async (request) => {
  const { tenantId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const promotions = await getActivePromotions(tenantId);
    return { promotions };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener promociones activas: ${error.message}`);
  }
});

// Obtener promociones
export const getPromotionsFunction = onCall(async (request) => {
  const { tenantId, filters } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const promotions = await getPromotions(tenantId, filters);
    return { promotions };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener promociones: ${error.message}`);
  }
});

// Actualizar promoción
export const updatePromotion = onCall(async (request) => {
  const { tenantId, promotionId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !promotionId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, promotionId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('promotions')
      .doc(promotionId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar promoción: ${error.message}`);
  }
});

// Activar promoción
export const activatePromotion = onCall(async (request) => {
  const { tenantId, promotionId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !promotionId) {
    throw new HttpsError('invalid-argument', 'tenantId y promotionId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('promotions')
      .doc(promotionId)
      .update({
        status: 'active',
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al activar promoción: ${error.message}`);
  }
});

// Pausar promoción
export const pausePromotion = onCall(async (request) => {
  const { tenantId, promotionId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !promotionId) {
    throw new HttpsError('invalid-argument', 'tenantId y promotionId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('promotions')
      .doc(promotionId)
      .update({
        status: 'paused',
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al pausar promoción: ${error.message}`);
  }
});

// Eliminar promoción
export const deletePromotion = onCall(async (request) => {
  const { tenantId, promotionId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !promotionId) {
    throw new HttpsError('invalid-argument', 'tenantId y promotionId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('promotions')
      .doc(promotionId)
      .delete();

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al eliminar promoción: ${error.message}`);
  }
});

// Enviar promoción a leads
export const sendPromotionToLeadsFunction = onCall(async (request) => {
  const { tenantId, promotionId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !promotionId) {
    throw new HttpsError('invalid-argument', 'tenantId y promotionId son requeridos');
  }

  try {
    await sendPromotionToLeads(tenantId, promotionId);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al enviar promoción a leads: ${error.message}`);
  }
});



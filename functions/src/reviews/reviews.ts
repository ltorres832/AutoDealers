// Cloud Functions para Reviews
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Crear review
export const createReview = onCall(async (request) => {
  const { tenantId, review } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !review) {
    throw new HttpsError('invalid-argument', 'tenantId y review son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('reviews')
      .doc();

    await docRef.set({
      ...review,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear review: ${error.message}`);
  }
});

// Obtener reviews
export const getReviews = onCall(async (request) => {
  const { tenantId, status, sellerId, vehicleId, limit } = request.data;
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
      .collection('reviews') as any;

    if (status) {
      query = query.where('status', '==', status);
    }
    if (sellerId) {
      query = query.where('sellerId', '==', sellerId);
    }
    if (vehicleId) {
      query = query.where('vehicleId', '==', vehicleId);
    }

    query = query.orderBy('createdAt', 'desc').limit(limit || 100);

    const snapshot = await query.get();
    const reviews = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    return { reviews };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener reviews: ${error.message}`);
  }
});

// Actualizar review
export const updateReview = onCall(async (request) => {
  const { tenantId, reviewId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !reviewId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, reviewId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('reviews')
      .doc(reviewId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar review: ${error.message}`);
  }
});

// Aprobar review
export const approveReview = onCall(async (request) => {
  const { tenantId, reviewId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !reviewId) {
    throw new HttpsError('invalid-argument', 'tenantId y reviewId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('reviews')
      .doc(reviewId)
      .update({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: auth.uid,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al aprobar review: ${error.message}`);
  }
});

// Responder review
export const respondToReview = onCall(async (request) => {
  const { tenantId, reviewId, response } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !reviewId || !response) {
    throw new HttpsError('invalid-argument', 'tenantId, reviewId y response son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('reviews')
      .doc(reviewId)
      .update({
        response,
        respondedAt: new Date(),
        respondedBy: auth.uid,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al responder review: ${error.message}`);
  }
});



// Sistema de calificaciones (ratings)

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface Rating {
  id: string;
  tenantId: string;
  saleId: string;
  vehicleId: string;
  sellerId: string;
  dealerId?: string;
  customerEmail: string;
  customerName: string;
  sellerRating: number; // 1-5
  dealerRating?: number; // 1-5 (si aplica)
  sellerComment?: string;
  dealerComment?: string;
  status: 'pending' | 'completed' | 'expired';
  surveyToken: string; // Token único para la encuesta
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

/**
 * Crea una nueva calificación pendiente cuando se marca un vehículo como vendido
 */
export async function createPendingRating(
  tenantId: string,
  saleId: string,
  vehicleId: string,
  sellerId: string,
  dealerId: string | undefined,
  customerEmail: string,
  customerName: string
): Promise<Rating> {
  // Generar token único para la encuesta
  const surveyToken = `${tenantId}_${saleId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // La encuesta expira en 30 días
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const ratingRef = getDb().collection('tenants')
    .doc(tenantId)
    .collection('ratings')
    .doc();

  const ratingData: Omit<Rating, 'id'> = {
    tenantId,
    saleId,
    vehicleId,
    sellerId,
    dealerId,
    customerEmail,
    customerName,
    sellerRating: 0,
    dealerRating: dealerId ? 0 : undefined,
    status: 'pending',
    surveyToken,
    createdAt: new Date(),
    expiresAt,
  };

  await ratingRef.set({
    ...ratingData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  } as any);

  return {
    id: ratingRef.id,
    ...ratingData,
  };
}

/**
 * Completa una calificación con las respuestas del cliente
 */
export async function completeRating(
  tenantId: string,
  ratingId: string,
  sellerRating: number,
  dealerRating: number | undefined,
  sellerComment?: string,
  dealerComment?: string
): Promise<void> {
  const ratingRef = getDb().collection('tenants')
    .doc(tenantId)
    .collection('ratings')
    .doc(ratingId);

  const ratingDoc = await ratingRef.get();
  if (!ratingDoc.exists) {
    throw new Error('Rating not found');
  }

  const ratingData = ratingDoc.data();
  if (ratingData?.status !== 'pending') {
    throw new Error('Rating already completed or expired');
  }

  await ratingRef.update({
    sellerRating,
    dealerRating: dealerRating || undefined,
    sellerComment: sellerComment || undefined,
    dealerComment: dealerComment || undefined,
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  // Actualizar promedios de calificaciones del vendedor y dealer
  await updateUserRatingAverage(tenantId, ratingData.sellerId, 'seller');
  if (ratingData.dealerId) {
    await updateUserRatingAverage(tenantId, ratingData.dealerId, 'dealer');
  }
}

/**
 * Obtiene una calificación por su token de encuesta
 */
export async function getRatingByToken(surveyToken: string): Promise<Rating | null> {
  // Buscar en todos los tenants (el token es único)
  const tenantsSnapshot = await getDb().collection('tenants').get();
  
  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;
    const ratingsSnapshot = await getDb().collection('tenants')
      .doc(tenantId)
      .collection('ratings')
      .where('surveyToken', '==', surveyToken)
      .limit(1)
      .get();

    if (!ratingsSnapshot.empty) {
      const doc = ratingsSnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
        expiresAt: data.expiresAt?.toDate() || new Date(),
      } as Rating;
    }
  }

  return null;
}

/**
 * Actualiza el promedio de calificaciones de un usuario (vendedor o dealer)
 */
async function updateUserRatingAverage(
  tenantId: string,
  userId: string,
  userType: 'seller' | 'dealer'
): Promise<void> {
  // Obtener todas las calificaciones completadas del usuario
  const ratingsSnapshot = await getDb().collection('tenants')
    .doc(tenantId)
    .collection('ratings')
    .where(userType === 'seller' ? 'sellerId' : 'dealerId', '==', userId)
    .where('status', '==', 'completed')
    .get();

  const ratings = ratingsSnapshot.docs.map(doc => doc.data());
  
  if (ratings.length === 0) {
    return;
  }

  // Calcular promedio
  const ratingField = userType === 'seller' ? 'sellerRating' : 'dealerRating';
  const totalRating = ratings.reduce((sum, rating) => sum + (rating[ratingField] || 0), 0);
  const averageRating = totalRating / ratings.length;

  // Actualizar en el documento del usuario
  const userRef = getDb().collection('users').doc(userId);
  await userRef.update({
    [`${userType}Rating`]: averageRating,
    [`${userType}RatingCount`]: ratings.length,
    [`${userType}RatingUpdatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Obtiene el promedio de calificaciones de un usuario
 */
export async function getUserRating(
  userId: string,
  userType: 'seller' | 'dealer'
): Promise<{ average: number; count: number }> {
  const userDoc = await getDb().collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData) {
    return { average: 0, count: 0 };
  }

  const ratingField = `${userType}Rating`;
  const countField = `${userType}RatingCount`;

  return {
    average: userData[ratingField] || 0,
    count: userData[countField] || 0,
  };
}



// Sistema de reseñas (reviews)

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface Review {
  id: string;
  tenantId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  rating: number; // 1-5
  title?: string;
  comment: string;
  photos?: string[]; // URLs de fotos
  videos?: string[]; // URLs de videos
  vehicleId?: string;
  saleId?: string;
  status: 'pending' | 'approved' | 'rejected';
  featured: boolean;
  response?: {
    text: string;
    respondedBy: string;
    respondedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea una nueva reseña
 */
export async function createReview(
  reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Review> {
  const docRef = db
    .collection('tenants')
    .doc(reviewData.tenantId)
    .collection('reviews')
    .doc();

  const reviewToSave: any = {
    ...reviewData,
    status: reviewData.status || 'pending',
    featured: reviewData.featured || false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.set(reviewToSave);

  return {
    id: docRef.id,
    ...reviewData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene todas las reseñas de un tenant
 */
export async function getReviews(
  tenantId: string,
  filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    featured?: boolean;
    minRating?: number;
    limit?: number;
  }
): Promise<Review[]> {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('reviews');

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters?.featured !== undefined) {
    query = query.where('featured', '==', filters.featured);
  }

  if (filters?.minRating) {
    query = query.where('rating', '>=', filters.minRating);
  }

  // Ordenar por fecha de creación (más recientes primero)
  query = query.orderBy('createdAt', 'desc');

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      response: data?.response
        ? {
            ...data.response,
            respondedAt: data.response.respondedAt?.toDate() || new Date(),
          }
        : undefined,
    } as Review;
  });
}

/**
 * Obtiene reseñas aprobadas para mostrar públicamente
 */
export async function getPublicReviews(
  tenantId: string,
  limit?: number
): Promise<Review[]> {
  return getReviews(tenantId, {
    status: 'approved',
    limit: limit || 50,
  });
}

/**
 * Obtiene una reseña por ID
 */
export async function getReviewById(
  tenantId: string,
  reviewId: string
): Promise<Review | null> {
  const doc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('reviews')
    .doc(reviewId)
    .get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
    response: data?.response
      ? {
          ...data.response,
          respondedAt: data.response.respondedAt?.toDate() || new Date(),
        }
      : undefined,
  } as Review;
}

/**
 * Actualiza una reseña
 */
export async function updateReview(
  tenantId: string,
  reviewId: string,
  updates: Partial<Review>
): Promise<void> {
  const updateData: any = {
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // No permitir actualizar id, tenantId, createdAt
  delete updateData.id;
  delete updateData.tenantId;
  delete updateData.createdAt;

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('reviews')
    .doc(reviewId)
    .update(updateData);
}

/**
 * Elimina una reseña
 */
export async function deleteReview(
  tenantId: string,
  reviewId: string
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('reviews')
    .doc(reviewId)
    .delete();
}

/**
 * Agrega una respuesta a una reseña
 */
export async function addReviewResponse(
  tenantId: string,
  reviewId: string,
  responseText: string,
  respondedBy: string
): Promise<void> {
  await updateReview(tenantId, reviewId, {
    response: {
      text: responseText,
      respondedBy,
      respondedAt: new Date(),
    },
  });
}

/**
 * Obtiene estadísticas de reseñas
 */
export async function getReviewStats(tenantId: string): Promise<{
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
}> {
  const allReviews = await getReviews(tenantId);

  const stats = {
    total: allReviews.length,
    approved: allReviews.filter((r) => r.status === 'approved').length,
    pending: allReviews.filter((r) => r.status === 'pending').length,
    rejected: allReviews.filter((r) => r.status === 'rejected').length,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as { [key: number]: number },
  };

  if (allReviews.length > 0) {
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    stats.averageRating = totalRating / allReviews.length;

    allReviews.forEach((review) => {
      stats.ratingDistribution[review.rating] =
        (stats.ratingDistribution[review.rating] || 0) + 1;
    });
  }

  return stats;
}


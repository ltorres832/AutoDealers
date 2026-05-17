// Sistema de reseñas (reviews)

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

// Lazy initialization
function getDb() {
  return getFirestore();
}

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
  sellerId?: string;
  dealerId?: string;
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
  const db = getDb();
  const docRef = db
    .collection('tenants')
    .doc(reviewData.tenantId)
    .collection('reviews')
    .doc();

  const reviewToSave: any = {
    ...reviewData,
    status: reviewData.status || 'pending',
    featured: reviewData.featured || false,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  };

  await docRef.set(reviewToSave);

  const review = {
    id: docRef.id,
    ...reviewData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await syncUserRatingsFromReview(review);

  return review;
}

/**
 * Promedio de reseñas aprobadas vinculadas a un vendedor o dealer.
 */
export async function getApprovedReviewRatingAggregate(
  tenantId: string,
  userId: string,
  userType: 'seller' | 'dealer'
): Promise<{ average: number; count: number }> {
  const db = getDb();
  const idField = userType === 'seller' ? 'sellerId' : 'dealerId';

  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('reviews')
    .where('status', '==', 'approved')
    .where(idField, '==', userId)
    .get();

  const ratings = snapshot.docs
    .map((doc) => Number(doc.data().rating))
    .filter((r) => r >= 1 && r <= 5);

  if (ratings.length === 0) {
    return { average: 0, count: 0 };
  }

  const total = ratings.reduce((sum, r) => sum + r, 0);
  return { average: total / ratings.length, count: ratings.length };
}

/**
 * Actualiza sellerRating/dealerRating en users/ a partir de reseñas aprobadas.
 */
export async function syncUserRatingFromApprovedReviews(
  tenantId: string,
  userId: string,
  userType: 'seller' | 'dealer'
): Promise<void> {
  const { average, count } = await getApprovedReviewRatingAggregate(
    tenantId,
    userId,
    userType
  );

  const ratingField = userType === 'seller' ? 'sellerRating' : 'dealerRating';
  const countField = userType === 'seller' ? 'sellerRatingCount' : 'dealerRatingCount';

  const db = getDb();
  await db
    .collection('users')
    .doc(userId)
    .update({
      [ratingField]: average,
      [countField]: count,
      [`${userType}RatingUpdatedAt`]: getFirestoreFieldValue().serverTimestamp(),
    } as Record<string, unknown>);
}

async function syncUserRatingsFromReview(review: Review): Promise<void> {
  if (review.status !== 'approved') return;
  try {
    if (review.sellerId) {
      await syncUserRatingFromApprovedReviews(
        review.tenantId,
        review.sellerId,
        'seller'
      );
    }
    if (review.dealerId) {
      await syncUserRatingFromApprovedReviews(
        review.tenantId,
        review.dealerId,
        'dealer'
      );
    }
  } catch (error) {
    console.error('Error syncing review ratings to user profile:', error);
  }
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
  const db = getDb();
  let query: any = db
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

function tenantIdFromReviewPath(path: string): string {
  const parts = path.split('/');
  return parts[0] === 'tenants' && parts.length >= 2 ? parts[1] : '';
}

function toReviewDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function mapReviewDoc(
  docId: string,
  tenantId: string,
  data: Record<string, unknown>
): Review {
  return {
    id: docId,
    tenantId,
    ...data,
    createdAt: toReviewDate(data.createdAt),
    updatedAt: toReviewDate(data.updatedAt),
    response: data?.response && typeof data.response === 'object'
      ? {
          ...(data.response as Record<string, unknown>),
          respondedAt: toReviewDate(
            (data.response as Record<string, unknown>).respondedAt
          ),
        }
      : undefined,
  } as Review;
}

/** ¿Esta reseña aprobada corresponde al vendedor público? (incluye reseñas sin sellerId). */
export async function reviewBelongsToPublicSeller(
  tenantId: string,
  sellerId: string,
  data: Record<string, unknown>,
  tenantCache: Map<string, Record<string, unknown> | null | undefined>
): Promise<boolean> {
  const sid = typeof data.sellerId === 'string' ? data.sellerId.trim() : '';
  if (sid) return sid === sellerId;

  let td = tenantCache.get(tenantId);
  if (td === undefined && tenantId) {
    const snap = await getDb().collection('tenants').doc(tenantId).get();
    td = snap.exists ? snap.data() : null;
    tenantCache.set(tenantId, td);
  }

  const primary =
    td?.sellerInfo &&
    typeof td.sellerInfo === 'object' &&
    typeof (td.sellerInfo as { id?: string }).id === 'string'
      ? String((td.sellerInfo as { id: string }).id).trim()
      : '';
  if (primary === sellerId) return true;

  if (td?.type === 'seller') {
    const createdBy = typeof td.createdBy === 'string' ? td.createdBy.trim() : '';
    if (createdBy === sellerId) return true;
  }

  const vehicleId = typeof data.vehicleId === 'string' ? data.vehicleId.trim() : '';
  if (vehicleId && tenantId) {
    try {
      const vSnap = await getDb()
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .doc(vehicleId)
        .get();
      if (vSnap.exists) {
        const vd = vSnap.data();
        const vs =
          (typeof vd?.sellerId === 'string' && vd.sellerId.trim()) ||
          (typeof vd?.assignedTo === 'string' && vd.assignedTo.trim()) ||
          '';
        if (vs === sellerId) return true;
      }
    } catch {
      /* ignore */
    }
  }

  return false;
}

/** Asigna sellerId a reseñas aprobadas huérfanas que pertenecen a este vendedor. */
export async function linkApprovedReviewsToSeller(
  tenantIds: string[],
  sellerId: string
): Promise<number> {
  const db = getDb();
  const tenantCache = new Map<string, Record<string, unknown> | null | undefined>();
  let patched = 0;

  for (const tenantId of tenantIds) {
    if (!tenantId?.trim()) continue;
    try {
      const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('reviews')
        .where('status', '==', 'approved')
        .limit(100)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.sellerId) continue;
        if (!(await reviewBelongsToPublicSeller(tenantId, sellerId, data, tenantCache))) {
          continue;
        }
        await updateReview(tenantId, doc.id, { sellerId });
        patched += 1;
      }
    } catch (error) {
      console.warn(`linkApprovedReviewsToSeller ${tenantId}:`, error);
    }
  }

  if (patched > 0) {
    await syncUserRatingFromApprovedReviews(tenantIds[0], sellerId, 'seller').catch(() => {});
  }

  return patched;
}

/** Reseñas aprobadas de un vendedor (varios tenants; incluye reseñas sin sellerId vinculadas). */
export async function getPublicReviewsForSeller(
  tenantIds: string[],
  sellerId: string,
  limit = 12
): Promise<Review[]> {
  const db = getDb();
  const tenantSet = new Set(tenantIds.filter((t) => t?.trim()));
  const tenantCache = new Map<string, Record<string, unknown> | null | undefined>();
  const merged: Review[] = [];

  await linkApprovedReviewsToSeller([...tenantSet], sellerId);

  const pushDoc = (docId: string, tenantId: string, data: Record<string, unknown>) => {
    merged.push(mapReviewDoc(docId, tenantId || (data.tenantId as string) || '', data));
  };

  try {
    let snapshot;
    try {
      snapshot = await db
        .collectionGroup('reviews')
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .limit(Math.max(limit * 4, 40))
        .get();
    } catch {
      snapshot = await db
        .collectionGroup('reviews')
        .where('status', '==', 'approved')
        .limit(Math.max(limit * 4, 40))
        .get();
    }

    for (const doc of snapshot.docs) {
      const tid = tenantIdFromReviewPath(doc.ref.path);
      const data = doc.data();
      if (data.status !== 'approved') continue;

      const sid = typeof data.sellerId === 'string' ? data.sellerId.trim() : '';
      if (sid === sellerId) {
        pushDoc(doc.id, tid, data);
        continue;
      }
      if (!sid && (await reviewBelongsToPublicSeller(tid, sellerId, data, tenantCache))) {
        pushDoc(doc.id, tid, { ...data, sellerId });
      }
    }
  } catch (error) {
    console.warn('getPublicReviewsForSeller collectionGroup:', error);
  }

  if (merged.length === 0) {
    for (const tenantId of tenantSet) {
      try {
        const snapshot = await db
          .collection('tenants')
          .doc(tenantId)
          .collection('reviews')
          .where('status', '==', 'approved')
          .limit(80)
          .get();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const sid = typeof data.sellerId === 'string' ? data.sellerId.trim() : '';
          if (sid && sid !== sellerId) continue;
          if (sid === sellerId || (await reviewBelongsToPublicSeller(tenantId, sellerId, data, tenantCache))) {
            pushDoc(doc.id, tenantId, sid ? data : { ...data, sellerId });
          }
        }
      } catch (fallbackError) {
        console.warn(`getPublicReviewsForSeller tenant ${tenantId}:`, fallbackError);
      }
    }
  }

  const seen = new Set<string>();
  const unique = merged.filter((r) => {
    const key = `${r.tenantId}:${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return unique.slice(0, limit);
}

/** Reseñas aprobadas del concesionario (dealerId o todas del tenant). */
export async function getPublicReviewsForDealer(
  tenantId: string,
  dealerId: string,
  limit = 12
): Promise<Review[]> {
  const db = getDb();
  const merged: Review[] = [];

  try {
    const byDealer = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('reviews')
      .where('status', '==', 'approved')
      .where('dealerId', '==', dealerId)
      .get();

    for (const doc of byDealer.docs) {
      const data = doc.data();
      merged.push({
        id: doc.id,
        tenantId,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
      } as Review);
    }
  } catch {
    // Sin índice dealerId: usar todas las aprobadas del tenant
    return getPublicReviews(tenantId, limit);
  }

  if (merged.length === 0) {
    return getPublicReviews(tenantId, limit);
  }

  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return merged.slice(0, limit);
}

export async function resolveSellerPublicRating(
  tenantIds: string[],
  sellerId: string,
  fallbackRating = 0,
  fallbackCount = 0
): Promise<{ rating: number; count: number }> {
  let weighted = 0;
  let count = 0;
  for (const tenantId of tenantIds) {
    if (!tenantId?.trim()) continue;
    try {
      const agg = await getApprovedReviewRatingAggregate(tenantId, sellerId, 'seller');
      weighted += agg.average * agg.count;
      count += agg.count;
    } catch {
      /* ignore */
    }
  }
  if (count > 0) {
    return { rating: weighted / count, count };
  }
  return { rating: fallbackRating, count: fallbackCount };
}

export async function resolveDealerPublicRating(
  tenantId: string,
  dealerId: string,
  fallbackRating = 0,
  fallbackCount = 0
): Promise<{ rating: number; count: number }> {
  try {
    const agg = await getApprovedReviewRatingAggregate(tenantId, dealerId, 'dealer');
    if (agg.count > 0) {
      return { rating: agg.average, count: agg.count };
    }
  } catch {
    /* ignore */
  }
  return { rating: fallbackRating, count: fallbackCount };
}

/** Vincula reseñas aprobadas sin sellerId y recalcula el perfil público del vendedor. */
export async function resyncSellerPublicRatings(
  tenantId: string,
  sellerId: string
): Promise<{ patched: number }> {
  const approved = await getReviews(tenantId, { status: 'approved' });
  let patched = 0;
  for (const review of approved) {
    if (!review.sellerId) {
      await updateReview(tenantId, review.id, { sellerId });
      patched += 1;
    }
  }
  await syncUserRatingFromApprovedReviews(tenantId, sellerId, 'seller');
  return { patched };
}

/** Vincula reseñas aprobadas sin dealerId y recalcula el perfil del concesionario. */
export async function resyncDealerPublicRatings(
  tenantId: string,
  dealerId: string
): Promise<{ patched: number }> {
  const approved = await getReviews(tenantId, { status: 'approved' });
  let patched = 0;
  for (const review of approved) {
    if (!review.dealerId) {
      await updateReview(tenantId, review.id, { dealerId });
      patched += 1;
    }
  }
  await syncUserRatingFromApprovedReviews(tenantId, dealerId, 'dealer');
  return { patched };
}

/**
 * Obtiene una reseña por ID
 */
export async function getReviewById(
  tenantId: string,
  reviewId: string
): Promise<Review | null> {
  const db = getDb();
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
/** Al aprobar, asegura sellerId/dealerId para que la reseña aparezca en la web pública. */
export async function enrichReviewPatchOnApprove(
  tenantId: string,
  existing: Review | null,
  patch: Partial<Review>,
  opts: { userId: string; role: string }
): Promise<Partial<Review>> {
  const nextStatus = patch.status ?? existing?.status;
  if (nextStatus !== 'approved') return patch;

  const out: Partial<Review> = { ...patch };

  if (!out.sellerId && !existing?.sellerId) {
    if (opts.role === 'seller') {
      out.sellerId = opts.userId;
    } else if (typeof patch.sellerId === 'string' && patch.sellerId.trim()) {
      out.sellerId = patch.sellerId.trim();
    } else if (existing?.vehicleId) {
      try {
        const vSnap = await getDb()
          .collection('tenants')
          .doc(tenantId)
          .collection('vehicles')
          .doc(existing.vehicleId)
          .get();
        if (vSnap.exists) {
          const vd = vSnap.data();
          const vs =
            (typeof vd?.sellerId === 'string' && vd.sellerId.trim()) ||
            (typeof vd?.assignedTo === 'string' && vd.assignedTo.trim()) ||
            '';
          if (vs) out.sellerId = vs;
        }
      } catch {
        /* ignore */
      }
    }
    if (!out.sellerId) {
      const tenantSnap = await getDb().collection('tenants').doc(tenantId).get();
      const td = tenantSnap.data();
      const primary =
        td?.sellerInfo &&
        typeof td.sellerInfo === 'object' &&
        typeof (td.sellerInfo as { id?: string }).id === 'string'
          ? String((td.sellerInfo as { id: string }).id).trim()
          : '';
      if (primary) out.sellerId = primary;
    }
  }

  if (!out.dealerId && !existing?.dealerId && opts.role === 'dealer') {
    out.dealerId = opts.userId;
  }

  return out;
}

export async function updateReview(
  tenantId: string,
  reviewId: string,
  updates: Partial<Review>
): Promise<void> {
  const updateData: any = {
    ...updates,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  };

  // No permitir actualizar id, tenantId, createdAt
  delete updateData.id;
  delete updateData.tenantId;
  delete updateData.createdAt;

  const db = getDb();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('reviews')
    .doc(reviewId)
    .update(updateData);

  const merged = await getReviewById(tenantId, reviewId);
  if (merged) {
    await syncUserRatingsFromReview(merged);
  }
}

/**
 * Elimina una reseña
 */
export async function deleteReview(
  tenantId: string,
  reviewId: string
): Promise<void> {
  const existing = await getReviewById(tenantId, reviewId);
  const db = getDb();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('reviews')
    .doc(reviewId)
    .delete();

  if (existing) {
    await syncUserRatingsFromReview(existing);
  }
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


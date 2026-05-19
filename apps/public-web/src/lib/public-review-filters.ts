import type { PublicReviewItem } from '@/components/PublicReviewsList';

/** Solo reseñas con datos mínimos y vínculo a cliente/venta/vehículo (evita reseñas de prueba inventadas). */
export function isVerifiablePublicReview(data: {
  customerName?: unknown;
  comment?: unknown;
  rating?: unknown;
  customerEmail?: unknown;
  saleId?: unknown;
  vehicleId?: unknown;
}): boolean {
  const customerName = typeof data.customerName === 'string' ? data.customerName.trim() : '';
  const comment = typeof data.comment === 'string' ? data.comment.trim() : '';
  const rating = Number(data.rating);
  if (!customerName || comment.length < 8) return false;
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return false;

  const hasProof =
    (typeof data.customerEmail === 'string' && data.customerEmail.trim().length > 0) ||
    (typeof data.saleId === 'string' && data.saleId.trim().length > 0) ||
    (typeof data.vehicleId === 'string' && data.vehicleId.trim().length > 0);

  return hasProof;
}

export function filterVerifiablePublicReviews(reviews: PublicReviewItem[]): PublicReviewItem[] {
  return reviews.filter((r) => isVerifiablePublicReview(r));
}

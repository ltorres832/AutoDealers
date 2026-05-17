import { getFirestore } from '@autodealers/core';

type SellerInfo = {
  id?: string;
  name?: string;
  photo?: string;
  bio?: string;
};

/** Añade tenantName, sellerId y nombre/foto del vendedor para fichas públicas. */
export async function enrichPublicVehicleDetail(
  vehicle: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const db = getFirestore();
  const tenantSnap = await db.collection('tenants').doc(tenantId).get();
  const tenantData = (tenantSnap.data() || {}) as Record<string, unknown>;
  const tenantName = typeof tenantData.name === 'string' ? tenantData.name : '';

  const sellerInfo =
    tenantData.sellerInfo && typeof tenantData.sellerInfo === 'object'
      ? (tenantData.sellerInfo as SellerInfo)
      : null;

  let sellerId =
    (typeof vehicle.sellerId === 'string' && vehicle.sellerId.trim()) ||
    (typeof vehicle.assignedTo === 'string' && vehicle.assignedTo.trim()) ||
    (typeof vehicle.createdBy === 'string' && vehicle.createdBy.trim()) ||
    (typeof sellerInfo?.id === 'string' && sellerInfo.id.trim()) ||
    '';

  let sellerName = '';
  let sellerPhoto = '';
  let sellerTitle = '';
  let sellerRating = 0;
  let sellerRatingCount = 0;

  if (sellerId) {
    const sellerSnap = await db.collection('users').doc(sellerId).get();
    if (sellerSnap.exists) {
      const s = sellerSnap.data() || {};
      sellerName = typeof s.name === 'string' ? s.name : '';
      sellerPhoto =
        (typeof s.photo === 'string' && s.photo) ||
        (typeof s.photoUrl === 'string' && s.photoUrl) ||
        '';
      sellerTitle =
        (typeof s.title === 'string' && s.title) ||
        (typeof s.jobTitle === 'string' && s.jobTitle) ||
        '';
      sellerRating = typeof s.sellerRating === 'number' ? s.sellerRating : 0;
      sellerRatingCount = typeof s.sellerRatingCount === 'number' ? s.sellerRatingCount : 0;
    }
  }

  if (!sellerName && sellerInfo?.name) {
    sellerName = sellerInfo.name;
    sellerPhoto = sellerInfo.photo || '';
  }

  return {
    ...vehicle,
    tenantId,
    tenantName,
    sellerId: sellerId || null,
    sellerName,
    sellerPhoto,
    sellerTitle,
    sellerRating,
    sellerRatingCount,
  };
}

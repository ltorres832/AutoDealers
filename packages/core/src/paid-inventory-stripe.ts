import * as admin from 'firebase-admin';
import { getFirestore } from './firebase';
import { expireFeaturedPromotions } from './featured-promotions';
import { isSponsoredContentExpired } from './sponsored-content-schedule';

function tsToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(value as string | number);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export async function markPremiumBannerPaid(input: {
  tenantId: string;
  bannerId?: string | null;
  paymentIntentId: string;
}): Promise<{ bannerId: string } | null> {
  const db = getFirestore();
  let bannerRef: FirebaseFirestore.DocumentReference | null = null;

  if (input.bannerId) {
    const ref = db.collection('tenants').doc(input.tenantId).collection('premium_banners').doc(input.bannerId);
    const snap = await ref.get();
    if (snap.exists) bannerRef = ref;
  }

  if (!bannerRef) {
    const byIntent = await db
      .collection('tenants')
      .doc(input.tenantId)
      .collection('premium_banners')
      .where('paymentIntentId', '==', input.paymentIntentId)
      .limit(1)
      .get();
    if (!byIntent.empty) bannerRef = byIntent.docs[0].ref;
  }

  if (!bannerRef) return null;

  const snap = await bannerRef.get();
  const data = snap.data() || {};
  const duration = Number(data.duration || 7);
  const alreadyExpires = tsToDate(data.expiresAt);
  const expiresAt = alreadyExpires || (() => {
    const next = new Date();
    next.setDate(next.getDate() + (Number.isFinite(duration) && duration > 0 ? duration : 7));
    return next;
  })();

  await bannerRef.set(
    {
      paymentStatus: 'paid',
      paid: true,
      paymentIntentId: input.paymentIntentId,
      paidAt: data.paidAt || admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { bannerId: bannerRef.id };
}

export async function activatePaidPromotionFromIntent(input: {
  tenantId: string;
  requestId?: string | null;
  paymentIntentId: string;
  metadata?: Record<string, string | undefined>;
}): Promise<{ promotionId: string; requestId: string } | null> {
  const db = getFirestore();
  const requests = db.collection('tenants').doc(input.tenantId).collection('paid_promotion_requests');

  let requestSnap: FirebaseFirestore.DocumentSnapshot | null = null;
  if (input.requestId) {
    const snap = await requests.doc(input.requestId).get();
    if (snap.exists) requestSnap = snap;
  }
  if (!requestSnap) {
    const byIntent = await requests.where('paymentIntentId', '==', input.paymentIntentId).limit(1).get();
    if (!byIntent.empty) requestSnap = byIntent.docs[0];
  }
  if (!requestSnap) return null;

  const requestData = requestSnap.data() || {};
  if (requestData.promotionId && (requestData.status === 'completed' || requestData.status === 'paid')) {
    return { promotionId: String(requestData.promotionId), requestId: requestSnap.id };
  }

  const promotionScope = String(
    input.metadata?.promotionScope || requestData.promotionScope || 'vehicle'
  ) as 'vehicle' | 'dealer' | 'seller';
  const vehicleId = String(input.metadata?.vehicleId || requestData.vehicleId || '').trim() || null;
  const duration = Number(input.metadata?.duration || requestData.duration || 7);
  const placement = typeof requestData.placement === 'string' ? requestData.placement : undefined;

  const tenantDoc = await db.collection('tenants').doc(input.tenantId).get();
  const tenantData = tenantDoc.data() || {};

  let promotionName = String(requestData.name || '');
  let promotionDescription = String(requestData.description || '');
  if (!promotionName) {
    if (promotionScope === 'vehicle' && vehicleId) {
      const vehicleDoc = await db.collection('tenants').doc(input.tenantId).collection('vehicles').doc(vehicleId).get();
      const vehicleData = vehicleDoc.data();
      promotionName = `Promoción Especial - ${vehicleData?.year || ''} ${vehicleData?.make || ''} ${vehicleData?.model || ''}`.trim();
      promotionDescription = `Oferta especial en este vehículo por ${duration} días`;
    } else if (promotionScope === 'dealer') {
      promotionName = `Promoción ${tenantData.name || 'Dealer'}`;
      promotionDescription = `Oferta especial de ${tenantData.name || 'este dealer'} por ${duration} días`;
    } else {
      promotionName = 'Promoción Vendedor';
      promotionDescription = `Oferta especial por ${duration} días`;
    }
  }

  const startDate = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (Number.isFinite(duration) && duration > 0 ? duration : 7));

  const promotionRef = db.collection('tenants').doc(input.tenantId).collection('promotions').doc();
  await promotionRef.set({
    tenantId: input.tenantId,
    name: promotionName,
    description: promotionDescription,
    type: 'special',
    discount: { type: 'percentage', value: 10 },
    applicableVehicles: vehicleId ? [vehicleId] : [],
    applicableToAll: promotionScope === 'dealer' || promotionScope === 'seller',
    startDate: admin.firestore.Timestamp.fromDate(startDate),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    status: 'active',
    isPaid: true,
    promotionScope,
    vehicleId,
    placement: placement || null,
    images: Array.isArray(requestData.images) ? requestData.images : [],
    videos: Array.isArray(requestData.videos) ? requestData.videos : [],
    animation: requestData.animation || null,
    price: Number(requestData.price || 0),
    duration,
    paymentId: input.paymentIntentId,
    paymentIntentId: input.paymentIntentId,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    views: 0,
    clicks: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await requestSnap.ref.set(
    {
      status: 'completed',
      paymentStatus: 'completed',
      promotionId: promotionRef.id,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { promotionId: promotionRef.id, requestId: requestSnap.id };
}

export async function activateFeaturedPromotionFromIntent(input: {
  tenantId: string;
  requestId?: string | null;
  paymentIntentId: string;
  userId?: string;
}): Promise<{ activePromotionId: string } | null> {
  const db = getFirestore();
  const requests = db.collection('tenants').doc(input.tenantId).collection('featured_promotion_requests');

  let requestSnap: FirebaseFirestore.DocumentSnapshot | null = null;
  if (input.requestId) {
    const snap = await requests.doc(input.requestId).get();
    if (snap.exists) requestSnap = snap;
  }
  if (!requestSnap) {
    const byIntent = await requests.where('stripePaymentIntentId', '==', input.paymentIntentId).limit(1).get();
    if (!byIntent.empty) requestSnap = byIntent.docs[0];
  }
  if (!requestSnap) return null;

  const data = requestSnap.data() || {};
  if (data.activePromotionId && data.status === 'active') {
    return { activePromotionId: String(data.activePromotionId) };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + Number(data.durationHours || 24) * 60 * 60 * 1000);
  const activeId = `${data.targetType}_${data.targetId}_${input.paymentIntentId}`;

  await db.collection('featured_promotions').doc(activeId).set(
    {
      targetType: data.targetType,
      targetId: data.targetId,
      tenantId: input.tenantId,
      sellerId: data.sellerId || null,
      kind: data.kind,
      planId: data.planId,
      planLabel: data.plan?.label || '',
      status: 'active',
      startsAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      price: data.price,
      currency: data.currency || 'usd',
      stripePaymentIntentId: input.paymentIntentId,
      createdBy: data.requestedBy || input.userId || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await requestSnap.ref.set(
    {
      status: 'active',
      activePromotionId: activeId,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { activePromotionId: activeId };
}

export async function expireSponsoredContent(): Promise<number> {
  const db = getFirestore();
  const now = new Date();
  const snap = await db.collection('sponsored_content').get();
  const expired = snap.docs.filter((doc) => {
    const data = doc.data();
    const status = String(data.status || '');
    if (!['active', 'approved'].includes(status)) return false;
    return isSponsoredContentExpired(data, now);
  });
  if (expired.length === 0) return 0;
  const batch = db.batch();
  expired.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'expired',
      expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return expired.length;
}

export async function expirePremiumBanners(): Promise<number> {
  const db = getFirestore();
  const now = Date.now();
  const snap = await db.collectionGroup('premium_banners').where('status', '==', 'active').get();
  const expired = snap.docs.filter((doc) => {
    const expiresAt = tsToDate(doc.data().expiresAt);
    return expiresAt !== null && expiresAt.getTime() <= now;
  });
  if (expired.length === 0) return 0;
  const batch = db.batch();
  expired.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'expired',
      expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return expired.length;
}

export async function expirePaidPromotions(): Promise<number> {
  const db = getFirestore();
  const now = Date.now();
  const snap = await db.collectionGroup('promotions').where('status', '==', 'active').get();
  const expired = snap.docs.filter((doc) => {
    const data = doc.data();
    const expiresAt = tsToDate(data.expiresAt) || tsToDate(data.endDate);
    return expiresAt !== null && expiresAt.getTime() <= now;
  });
  if (expired.length === 0) return 0;
  const batch = db.batch();
  expired.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'expired',
      expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return expired.length;
}

export async function expirePaidAdInventory(): Promise<{
  sponsored: number;
  banners: number;
  promotions: number;
  featured: number;
}> {
  const [sponsored, banners, promotions, featured] = await Promise.all([
    expireSponsoredContent(),
    expirePremiumBanners(),
    expirePaidPromotions(),
    expireFeaturedPromotions(),
  ]);
  return { sponsored, banners, promotions, featured };
}

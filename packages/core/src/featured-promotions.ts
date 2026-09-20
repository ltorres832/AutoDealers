import * as admin from 'firebase-admin';
import { getFirestore } from './firebase';

export type FeaturedTargetType = 'vehicle' | 'seller' | 'dealer';
export type FeaturedKind = 'featured' | 'boost_24h';
export type FeaturedStatus = 'pending_payment' | 'active' | 'expired' | 'cancelled';

export type FeaturedPlan = {
  id: string;
  label: string;
  targetType: FeaturedTargetType;
  kind: FeaturedKind;
  durationHours: number;
  price: number;
  currency: 'usd';
  active: boolean;
  sortOrder: number;
};

export type FeaturedConfig = {
  enabled: boolean;
  maxFeaturedVehicles: number;
  maxFeaturedSellers: number;
  maxFeaturedDealers: number;
  maxBoostedVehicles: number;
  badgeFeatured: string;
  badgeBoost: string;
  plans: FeaturedPlan[];
};

export type FeaturedPromotion = {
  id: string;
  targetType: FeaturedTargetType;
  targetId: string;
  tenantId: string;
  sellerId?: string | null;
  kind: FeaturedKind;
  planId: string;
  status: FeaturedStatus;
  startsAt: Date;
  expiresAt: Date;
  price: number;
  currency: 'usd';
  stripePaymentIntentId?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export const DEFAULT_FEATURED_CONFIG: FeaturedConfig = {
  enabled: true,
  maxFeaturedVehicles: 12,
  maxFeaturedSellers: 6,
  maxFeaturedDealers: 6,
  maxBoostedVehicles: 8,
  badgeFeatured: 'Destacado',
  badgeBoost: 'Boost 24h',
  plans: [
    { id: 'vehicle_boost_24h', label: 'Boost auto 24 horas', targetType: 'vehicle', kind: 'boost_24h', durationHours: 24, price: 9.99, currency: 'usd', active: true, sortOrder: 1 },
    { id: 'vehicle_featured_3d', label: 'Auto destacado 3 días', targetType: 'vehicle', kind: 'featured', durationHours: 72, price: 14.99, currency: 'usd', active: true, sortOrder: 2 },
    { id: 'vehicle_featured_7d', label: 'Auto destacado 7 días', targetType: 'vehicle', kind: 'featured', durationHours: 168, price: 29.99, currency: 'usd', active: true, sortOrder: 3 },
    { id: 'vehicle_featured_15d', label: 'Auto destacado 15 días', targetType: 'vehicle', kind: 'featured', durationHours: 360, price: 49.99, currency: 'usd', active: true, sortOrder: 4 },
    { id: 'vehicle_featured_30d', label: 'Auto destacado 30 días', targetType: 'vehicle', kind: 'featured', durationHours: 720, price: 79.99, currency: 'usd', active: true, sortOrder: 5 },
    { id: 'seller_boost_24h', label: 'Boost vendedor 24 horas', targetType: 'seller', kind: 'boost_24h', durationHours: 24, price: 14.99, currency: 'usd', active: true, sortOrder: 10 },
    { id: 'seller_featured_7d', label: 'Vendedor destacado 7 días', targetType: 'seller', kind: 'featured', durationHours: 168, price: 49.99, currency: 'usd', active: true, sortOrder: 11 },
    { id: 'seller_featured_30d', label: 'Vendedor destacado 30 días', targetType: 'seller', kind: 'featured', durationHours: 720, price: 149.99, currency: 'usd', active: true, sortOrder: 12 },
    { id: 'dealer_boost_24h', label: 'Boost dealer 24 horas', targetType: 'dealer', kind: 'boost_24h', durationHours: 24, price: 24.99, currency: 'usd', active: true, sortOrder: 20 },
    { id: 'dealer_featured_7d', label: 'Dealer destacado 7 días', targetType: 'dealer', kind: 'featured', durationHours: 168, price: 89.99, currency: 'usd', active: true, sortOrder: 21 },
    { id: 'dealer_featured_30d', label: 'Dealer destacado 30 días', targetType: 'dealer', kind: 'featured', durationHours: 720, price: 249.99, currency: 'usd', active: true, sortOrder: 22 },
  ],
};

function tsToDate(value: any): Date {
  return value?.toDate?.() || (value instanceof Date ? value : new Date(value || Date.now()));
}

export async function getFeaturedConfig(): Promise<FeaturedConfig> {
  const snap = await getFirestore().collection('admin_config').doc('featured_promotions').get();
  const data = snap.exists ? (snap.data() as Partial<FeaturedConfig>) : {};
  const planMap = new Map<string, FeaturedPlan>();
  for (const p of DEFAULT_FEATURED_CONFIG.plans) planMap.set(p.id, p);
  for (const p of data.plans || []) {
    if (p?.id) planMap.set(p.id, { ...planMap.get(p.id), ...p } as FeaturedPlan);
  }
  return {
    ...DEFAULT_FEATURED_CONFIG,
    ...data,
    plans: [...planMap.values()].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function saveFeaturedConfig(config: FeaturedConfig): Promise<FeaturedConfig> {
  const next = {
    ...DEFAULT_FEATURED_CONFIG,
    ...config,
    plans: (config.plans || []).map((p, index) => ({
      ...p,
      id: p.id.trim(),
      price: Number(p.price) || 0,
      durationHours: Math.max(1, Number(p.durationHours) || 24),
      currency: 'usd' as const,
      sortOrder: Number(p.sortOrder ?? index),
      active: p.active !== false,
    })),
  };
  await getFirestore().collection('admin_config').doc('featured_promotions').set(
    {
      ...next,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return next;
}

export async function getFeaturedPlan(
  planId: string,
  targetType?: FeaturedTargetType
): Promise<FeaturedPlan | null> {
  const config = await getFeaturedConfig();
  return (
    config.plans.find((p) => p.id === planId && p.active && (!targetType || p.targetType === targetType)) ||
    null
  );
}

export async function listActiveFeaturedPromotions(options?: {
  targetType?: FeaturedTargetType;
  kind?: FeaturedKind;
  limit?: number;
}): Promise<FeaturedPromotion[]> {
  const db = getFirestore();
  const now = new Date();
  let query: FirebaseFirestore.Query = db.collection('featured_promotions').where('status', '==', 'active');
  if (options?.targetType) query = query.where('targetType', '==', options.targetType);
  if (options?.kind) query = query.where('kind', '==', options.kind);

  const snap = await query.get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startsAt: tsToDate(data.startsAt),
        expiresAt: tsToDate(data.expiresAt),
        createdAt: tsToDate(data.createdAt),
        updatedAt: tsToDate(data.updatedAt),
      } as FeaturedPromotion;
    })
    .filter((p) => p.startsAt <= now && p.expiresAt > now)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'boost_24h' ? -1 : 1;
      return b.expiresAt.getTime() - a.expiresAt.getTime();
    })
    .slice(0, options?.limit || 50);
}

export type FeaturedRequest = {
  id: string;
  tenantId: string;
  targetType: string;
  targetId: string;
  planId: string;
  planLabel?: string;
  kind: string;
  price: number;
  currency: string;
  status: string;
  createdAt: Date;
};

/**
 * Registro completo de promociones que alguna vez se activaron
 * (activas, expiradas y canceladas). Se ordena en memoria para no depender
 * de índices y no perder documentos sin `createdAt`.
 */
export async function listFeaturedPromotionsHistory(options?: {
  limit?: number;
}): Promise<FeaturedPromotion[]> {
  const db = getFirestore();
  const snap = await db.collection('featured_promotions').get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startsAt: tsToDate(data.startsAt),
        expiresAt: tsToDate(data.expiresAt),
        createdAt: tsToDate(data.createdAt),
        updatedAt: tsToDate(data.updatedAt),
      } as FeaturedPromotion;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, options?.limit || 300);
}

/**
 * Solicitudes en cola (pago pendiente) en todos los tenants.
 */
export async function listPendingFeaturedRequests(options?: {
  limit?: number;
}): Promise<FeaturedRequest[]> {
  const db = getFirestore();
  const snap = await db.collectionGroup('featured_promotion_requests').get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        tenantId: data.tenantId || doc.ref.parent.parent?.id || '',
        targetType: data.targetType || '',
        targetId: data.targetId || '',
        planId: data.planId || '',
        planLabel: data.plan?.label || data.planLabel || '',
        kind: data.kind || '',
        price: Number(data.price) || 0,
        currency: data.currency || 'usd',
        status: data.status || '',
        createdAt: tsToDate(data.createdAt),
      } as FeaturedRequest;
    })
    .filter((r) => r.status === 'pending_payment')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, options?.limit || 100);
}

export async function expireFeaturedPromotions(): Promise<number> {
  const db = getFirestore();
  const now = Date.now();
  // Solo un filtro de igualdad para evitar índice compuesto (status + expiresAt).
  // El corte por expiración se hace en memoria.
  const snap = await db
    .collection('featured_promotions')
    .where('status', '==', 'active')
    .get();
  const expired = snap.docs.filter((doc) => {
    const data = doc.data();
    return tsToDate(data.expiresAt).getTime() <= now;
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

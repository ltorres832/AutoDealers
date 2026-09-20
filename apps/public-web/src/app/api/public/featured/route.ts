import { NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { normalizeVehiclesArray } from '@/lib/vehicle-photos-normalize';
import {
  flagsForFeaturedPromotion,
  getActiveFeaturedByTarget,
} from '@/lib/public-featured-promotions';
import { isDemoPromoAccount, isKnownDemoId } from '@/lib/public-catalog-visibility';

export const dynamic = 'force-dynamic';

function toPlain(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null,
  };
}

export async function GET() {
  const db = getFirestore();
  const [vehiclesMap, sellersMap, dealersMap] = await Promise.all([
    getActiveFeaturedByTarget('vehicle'),
    getActiveFeaturedByTarget('seller'),
    getActiveFeaturedByTarget('dealer'),
  ]);

  const vehicles: Record<string, unknown>[] = [];
  for (const promo of vehiclesMap.values()) {
    if (isKnownDemoId(promo.tenantId) || isKnownDemoId(promo.targetId)) continue;
    const snap = await db.collection('tenants').doc(promo.tenantId).collection('vehicles').doc(promo.targetId).get();
    if (snap.exists) {
      const row = {
        ...toPlain(snap),
        tenantId: promo.tenantId,
        ...flagsForFeaturedPromotion(promo),
      };
      if (isDemoPromoAccount(row, snap.id)) continue;
      vehicles.push(row);
    }
  }

  const sellers: Record<string, unknown>[] = [];
  for (const promo of sellersMap.values()) {
    if (isKnownDemoId(promo.tenantId) || isKnownDemoId(promo.targetId)) continue;
    const snap = await db.collection('users').doc(promo.targetId).get();
    if (snap.exists) {
      const row = { ...toPlain(snap), ...flagsForFeaturedPromotion(promo) };
      if (isDemoPromoAccount(row, snap.id)) continue;
      sellers.push(row);
    }
  }

  const dealers: Record<string, unknown>[] = [];
  for (const promo of dealersMap.values()) {
    if (isKnownDemoId(promo.tenantId) || isKnownDemoId(promo.targetId)) continue;
    const snap = await db.collection('users').doc(promo.targetId).get();
    if (snap.exists) {
      const row = { ...toPlain(snap), ...flagsForFeaturedPromotion(promo) };
      if (isDemoPromoAccount(row, snap.id)) continue;
      dealers.push(row);
    }
  }

  return NextResponse.json({
    vehicles: normalizeVehiclesArray(vehicles),
    sellers,
    dealers,
  });
}

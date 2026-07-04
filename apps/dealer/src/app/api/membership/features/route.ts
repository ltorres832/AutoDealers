export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantFeatures, getTenantMembership } from '@autodealers/core';
import { getSubUsers } from '@autodealers/core';
import { getActiveDynamicFeatureCatalog } from '@autodealers/billing/dynamic-feature-catalog';
import { normalizeMembershipFeatures } from '@autodealers/billing/membership-coerce';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const features = await getTenantFeatures(auth.tenantId);
    const membership = await getTenantMembership(auth.tenantId);

    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 404 });
    }

    const sellers = await getSubUsers(auth.tenantId);
    const { getVehicles } = await import('@autodealers/inventory');
    const vehicles = await getVehicles(auth.tenantId);

    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const campaignsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('campaigns')
      .get();

    const limits = [
      {
        name: 'Vendedores',
        current: sellers.length,
        limit: features.maxSellers ?? membership.features.maxSellers ?? null,
        icon: '👥',
      },
      {
        name: 'Inventario',
        current: vehicles.length,
        limit: features.maxInventory ?? membership.features.maxInventory ?? null,
        icon: '🚗',
      },
      {
        name: 'Campañas',
        current: campaignsSnapshot.size,
        limit: membership.features.maxCampaigns ?? null,
        icon: '📢',
      },
    ];

    const normalizedFeatures = normalizeMembershipFeatures(
      membership.features as unknown as Record<string, unknown>
    );
    const dynamicFeatureCatalog = await getActiveDynamicFeatureCatalog();

    return NextResponse.json({
      membershipName: membership.name,
      membershipType: membership.type,
      features: normalizedFeatures,
      dynamicFeatureCatalog,
      limits,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching membership features:', error);
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

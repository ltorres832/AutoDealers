export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantFeatures, getTenantMembership } from '@autodealers/core';
import { resolveBillingTenantId } from '@/lib/billing-tenant';
import { getActiveDynamicFeatureCatalog } from '@autodealers/billing/dynamic-feature-catalog';
import { normalizeMembershipFeatures } from '@autodealers/billing/membership-coerce';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const featureTenantId =
      resolveBillingTenantId(auth.tenantId, auth.dealerId, auth.billingMode) ?? auth.tenantId;

    const features = await getTenantFeatures(featureTenantId);
    const membership = await getTenantMembership(featureTenantId);

    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 404 });
    }

    const limits: Array<{ name: string; current: number; limit: number | null; icon: string }> = [];

    if (features.maxInventory && features.maxInventory > 0 && auth.role === 'seller') {
      const {
        filterVehiclesOwnedBySeller,
        loadVehiclesForSellerWorkspace,
      } = await import('@/lib/seller-vehicles');
      const all = await loadVehiclesForSellerWorkspace(auth);
      const vehicles = filterVehiclesOwnedBySeller(all, auth.userId);
      limits.push({
        name: 'Inventario',
        current: vehicles.length,
        limit: features.maxInventory,
        icon: '🚗',
      });
    }

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

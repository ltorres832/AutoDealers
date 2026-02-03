export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantFeatures, getTenantMembership } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener features del tenant
    const features = await getTenantFeatures(auth.tenantId);
    const membership = await getTenantMembership(auth.tenantId);

    if (!membership) {
      return NextResponse.json(
        { error: 'No active membership' },
        { status: 404 }
      );
    }

    // Los sellers no tienen límites numéricos complejos, pero pueden tener algunos
    const limits: any[] = [];

    // Si el seller tiene su propio inventario (algunos planes lo permiten)
    if (features.maxInventory && features.maxInventory > 0) {
      const { getVehicles } = await import('@autodealers/inventory');
      const vehicles = await getVehicles(auth.tenantId);
      limits.push({
        name: 'Inventario',
        current: vehicles.length,
        limit: features.maxInventory,
        icon: '🚗',
      });
    }

    return NextResponse.json({
      membershipName: membership.name,
      membershipType: membership.type,
      features: {
        customSubdomain: features.customSubdomain,
        aiEnabled: features.aiEnabled,
        socialMediaEnabled: features.socialMediaEnabled,
        marketplaceEnabled: features.marketplaceEnabled,
        advancedReports: features.advancedReports,
      },
      limits,
    });
  } catch (error: any) {
    console.error('Error fetching membership features:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



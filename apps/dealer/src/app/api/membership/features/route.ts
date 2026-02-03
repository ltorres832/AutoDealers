export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantFeatures, getTenantMembership } from '@autodealers/core';
import { getSubUsers } from '@autodealers/core';

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

    // Obtener límites actuales
    const sellers = await getSubUsers(auth.tenantId);
    
    // Obtener inventario
    const { getVehicles } = await import('@autodealers/inventory');
    const vehicles = await getVehicles(auth.tenantId);

    // Obtener campaigns
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
        limit: features.maxSellers || null,
        icon: '👥',
      },
      {
        name: 'Inventario',
        current: vehicles.length,
        limit: features.maxInventory || null,
        icon: '🚗',
      },
      {
        name: 'Campaigns',
        current: campaignsSnapshot.size,
        limit: membership.features.maxCampaigns || null,
        icon: '📢',
      },
    ];

    return NextResponse.json({
      membershipName: membership.name,
      membershipType: membership.type,
      features: {
        customSubdomain: features.customSubdomain,
        aiEnabled: features.aiEnabled,
        socialMediaEnabled: features.socialMediaEnabled,
        marketplaceEnabled: features.marketplaceEnabled,
        advancedReports: features.advancedReports,
        freePromotionsOnLanding: membership.features.freePromotionsOnLanding || false,
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


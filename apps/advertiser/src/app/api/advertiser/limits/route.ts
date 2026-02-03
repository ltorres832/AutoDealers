import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdvertiserPlanLimits, getMonthlyImpressionsUsage, canCreateBanner } from '@autodealers/core';
import { getAdvertiserContent } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const limits = await getAdvertiserPlanLimits(auth.userId);
    const impressionsUsage = await getMonthlyImpressionsUsage(auth.userId);
    
    // Contar banners activos
    const campaigns = await getAdvertiserContent(auth.userId);
    const now = new Date();
    const activeBanners = campaigns.filter((c) => {
      const endDate = c.endDate instanceof Date ? c.endDate : new Date(c.endDate);
      return c.status === 'active' && endDate >= now;
    }).length;

    return NextResponse.json({
      limits: {
        maxImpressionsPerMonth: limits.maxImpressionsPerMonth,
        maxBanners: limits.maxBanners,
        allowedPlacements: limits.allowedPlacements,
        hasAdvancedDashboard: limits.hasAdvancedDashboard,
        hasAdvancedMetrics: limits.hasAdvancedMetrics,
        hasBasicTargeting: limits.hasBasicTargeting,
        hasAdvancedTargeting: limits.hasAdvancedTargeting,
        hasABTesting: limits.hasABTesting,
      },
      impressionsUsage,
      activeBanners,
      maxBanners: limits.maxBanners,
      allowedPlacements: limits.allowedPlacements,
    });
  } catch (error: any) {
    console.error('Error fetching limits:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


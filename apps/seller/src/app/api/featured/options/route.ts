import { NextResponse } from 'next/server';
import { getFeaturedConfig } from '@autodealers/core/featured-promotions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getFeaturedConfig();
  return NextResponse.json({
    enabled: config.enabled,
    badgeFeatured: config.badgeFeatured,
    badgeBoost: config.badgeBoost,
    plans: config.plans.filter((p) => p.active && (p.targetType === 'vehicle' || p.targetType === 'seller')),
  });
}

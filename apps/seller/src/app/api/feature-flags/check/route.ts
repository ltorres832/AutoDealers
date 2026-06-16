import { NextRequest, NextResponse } from 'next/server';
import { resolveDashboardFeatureEnabled } from '@autodealers/core/dashboard-feature-membership';
import type { DashboardType } from '@autodealers/core/feature-flags';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboard = searchParams.get('dashboard') as DashboardType;
    const featureKey = searchParams.get('featureKey');

    if (!dashboard || !featureKey) {
      return NextResponse.json(
        { error: 'dashboard y featureKey son requeridos' },
        { status: 400 }
      );
    }

    const auth = await verifyAuth(request);
    const tenantId =
      auth && (dashboard === 'dealer' || dashboard === 'seller') ? auth.tenantId : undefined;

    const enabled = await resolveDashboardFeatureEnabled(dashboard, featureKey, tenantId);
    return NextResponse.json({ enabled });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al verificar feature flag';
    console.error('Error checking feature flag:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

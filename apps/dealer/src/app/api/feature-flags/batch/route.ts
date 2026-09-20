import { NextRequest, NextResponse } from 'next/server';
import { resolveDashboardFeaturesBatch } from '@autodealers/core/dashboard-feature-membership';
import type { DashboardType } from '@autodealers/core/feature-flags';
import { verifyAuth, billingTenantId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      dashboard?: DashboardType;
      featureKeys?: string[];
    };

    const dashboard = body.dashboard ?? 'dealer';
    const featureKeys = Array.isArray(body.featureKeys)
      ? body.featureKeys.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
      : [];

    if (featureKeys.length === 0) {
      return NextResponse.json({ features: {} });
    }

    const tenantId = billingTenantId(auth);
    const features = await resolveDashboardFeaturesBatch(dashboard, featureKeys, tenantId);

    return NextResponse.json({ features, tenantId: tenantId ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al verificar features';
    console.error('feature-flags/batch dealer:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

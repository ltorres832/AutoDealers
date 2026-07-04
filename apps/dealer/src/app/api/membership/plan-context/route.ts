import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantMembershipId } from '@autodealers/core';
import { verifyAuth, billingTenantId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billingTenant = billingTenantId(auth);
    const membershipId = billingTenant
      ? await resolveTenantMembershipId(billingTenant)
      : null;

    return NextResponse.json({
      billingTenantId: billingTenant ?? null,
      membershipId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener contexto del plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

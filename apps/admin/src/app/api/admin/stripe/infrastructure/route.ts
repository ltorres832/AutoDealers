export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getStripeInfrastructureStatus } from '@autodealers/core';
import { resolveAdminUrl } from '@autodealers/shared/platform-urls';

function resolveWebhookUrl(): string {
  return `${resolveAdminUrl()}/api/webhooks/stripe`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const status = await getStripeInfrastructureStatus(resolveWebhookUrl());
    return NextResponse.json({ success: true, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

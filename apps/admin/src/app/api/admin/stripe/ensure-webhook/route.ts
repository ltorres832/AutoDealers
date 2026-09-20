export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { completeStripeAdminSetup } from '@autodealers/core';
import { resolveAdminUrl } from '@autodealers/shared/platform-urls';

function resolveWebhookUrl(): string {
  return `${resolveAdminUrl()}/api/webhooks/stripe`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await completeStripeAdminSetup(resolveWebhookUrl(), auth.userId);

    const envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const appHostingWebhookNote =
      result.webhookSecretAutoConfigured && envWebhookSecret
        ? 'También actualiza STRIPE_WEBHOOK_SECRET en App Hosting si usas secretos de entorno con prioridad sobre Firestore.'
        : undefined;

    return NextResponse.json({
      success: true,
      message: result.message,
      appHostingWebhookNote,
      result: result.webhook,
      status: result.status,
      stripeSetup: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

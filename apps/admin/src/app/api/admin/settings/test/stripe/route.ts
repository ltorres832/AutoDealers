export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getFirestore,
  getStripeWebhookSecret,
  isValidStripeWebhookSecret,
  resolveStripeCredentialInput,
  validateStripeCredentialsPair,
} from '@autodealers/core';
import { resolveAdminUrl } from '@autodealers/shared/platform-urls';

const db = getFirestore();

function resolveAdminWebhookUrl(): string {
  return `${resolveAdminUrl()}/api/webhooks/stripe`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const credentialsDoc = await db.collection('system_settings').doc('credentials').get();
    const stored = credentialsDoc.data() || {};

    const effectiveSk = resolveStripeCredentialInput(body.stripeSecretKey, stored.stripeSecretKey);
    const effectivePk = resolveStripeCredentialInput(
      body.stripePublishableKey,
      stored.stripePublishableKey
    );

    const webhookSecret = await getStripeWebhookSecret();
    const webhookSecretConfigured = isValidStripeWebhookSecret(webhookSecret);

    const validation = await validateStripeCredentialsPair(effectiveSk, effectivePk);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Credenciales Stripe inválidas',
          hint:
            !effectiveSk || !effectivePk
              ? 'Debes pegar sk_... y pk_... completos (mismo modo TEST o LIVE). Si un campo muestra ••••, escribe la clave entera de nuevo.'
              : undefined,
          webhookEndpoint: resolveAdminWebhookUrl(),
          webhookSecretConfigured,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Conexión con Stripe exitosa (modo ${validation.mode?.toUpperCase()})`,
      mode: validation.mode,
      accountId: validation.accountId,
      accountName: validation.accountName,
      chargesEnabled: validation.chargesEnabled,
      connectTransfersEnabled: validation.connectTransfersEnabled,
      webhookEndpoint: resolveAdminWebhookUrl(),
      webhookSecretConfigured,
      webhookSecretHint: webhookSecretConfigured
        ? 'Webhook secret ya configurado'
        : 'Al guardar las claves, el webhook se configurará automáticamente',
    });
  } catch (error) {
    console.error('Error testing Stripe connection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

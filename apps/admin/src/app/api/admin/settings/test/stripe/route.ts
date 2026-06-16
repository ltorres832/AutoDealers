export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getStripeInstance,
  getStripeWebhookSecret,
  isValidStripeWebhookSecret,
} from '@autodealers/core';

function resolveAdminWebhookUrl(): string {
  const base =
    process.env.ADMIN_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    'https://admin-app--autodealers-7f62e.us-central1.hosted.app';
  return `${base.replace(/\/$/, '')}/api/webhooks/stripe`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookSecret = await getStripeWebhookSecret();
    const webhookSecretConfigured = isValidStripeWebhookSecret(webhookSecret);

    try {
      const stripe = await getStripeInstance();
      const account = await stripe.accounts.retrieve();

      return NextResponse.json({
        success: true,
        message: 'Conexión con Stripe exitosa',
        accountId: account.id,
        webhookEndpoint: resolveAdminWebhookUrl(),
        webhookSecretConfigured,
        webhookSecretHint: webhookSecretConfigured
          ? 'Signing secret válido (whsec_...)'
          : 'Configura whsec_... en Admin → Configuración → Stripe (no uses la URL del endpoint como secreto)',
      });
    } catch (stripeError: unknown) {
      const message =
        stripeError instanceof Error ? stripeError.message : 'Error al conectar con Stripe';
      console.error('Stripe error:', stripeError);
      return NextResponse.json(
        {
          success: false,
          error: message,
          webhookEndpoint: resolveAdminWebhookUrl(),
          webhookSecretConfigured,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error testing Stripe connection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

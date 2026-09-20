import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getEmailCredentials, getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

const DEFAULT_RESEND_EVENTS = ['email.replied', 'email.bounced', 'email.delivered'];
const FALLBACK_RESEND_EVENTS = ['email.received', 'email.bounced', 'email.delivered'];

function isResendApiKey(apiKey: string): boolean {
  return apiKey.startsWith('re_') || apiKey.includes('re_');
}

async function createResendWebhook(apiKey: string, endpoint: string, events: string[]) {
  const response = await fetch('https://api.resend.com/webhooks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint, events }),
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const endpoint = String(body.endpoint || `${origin}/api/fi/email-reply`).trim();

    if (!endpoint.startsWith('https://') && !endpoint.startsWith('http://localhost')) {
      return NextResponse.json(
        { error: 'El webhook debe usar HTTPS en producción.' },
        { status: 400 }
      );
    }

    const emailCreds = await getEmailCredentials();
    if (!emailCreds.apiKey) {
      return NextResponse.json({ error: 'No hay emailApiKey configurada.' }, { status: 400 });
    }

    if (!isResendApiKey(emailCreds.apiKey)) {
      return NextResponse.json(
        { error: 'La creación automática solo está disponible para Resend.' },
        { status: 400 }
      );
    }

    let events = Array.isArray(body.events) && body.events.length > 0
      ? body.events.map(String)
      : DEFAULT_RESEND_EVENTS;
    let { response, data } = await createResendWebhook(emailCreds.apiKey, endpoint, events);

    if (!response.ok && events.includes('email.replied')) {
      events = FALLBACK_RESEND_EVENTS;
      ({ response, data } = await createResendWebhook(emailCreds.apiKey, endpoint, events));
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.message || data?.error || 'Resend rechazó la creación del webhook.',
          details: data,
        },
        { status: response.status }
      );
    }

    const db = getFirestore();
    await db.collection('system_settings').doc('credentials').set(
      {
        fiEmailWebhookProvider: 'resend',
        fiEmailWebhookEndpoint: endpoint,
        fiEmailWebhookId: data.id || null,
        fiEmailWebhookSigningSecret: data.signing_secret || null,
        fiEmailWebhookEvents: events,
        fiEmailWebhookCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      provider: 'resend',
      endpoint,
      events,
      webhookId: data.id,
      signingSecretSaved: Boolean(data.signing_secret),
    });
  } catch (error: unknown) {
    console.error('Error creando webhook F&I en Resend:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear webhook F&I' },
      { status: 500 }
    );
  }
}

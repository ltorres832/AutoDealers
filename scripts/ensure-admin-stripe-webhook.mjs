#!/usr/bin/env node
/**
 * Asegura que el webhook de Admin incluya payment_intent.succeeded y el resto
 * de eventos requeridos. Usa la clave de Firestore system_settings/credentials.
 *
 *   node scripts/ensure-admin-stripe-webhook.mjs
 */
import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../apps/admin/package.json')
);
const Stripe = require('stripe');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const WEBHOOK_URL =
  process.env.ADMIN_STRIPE_WEBHOOK_URL ||
  'https://admin.autodealers-online.com/api/webhooks/stripe';

const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'payment_intent.succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'account.updated',
  'transfer.reversed',
];

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

async function secretKey() {
  if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    return process.env.STRIPE_SECRET_KEY.trim();
  }
  const doc = await db.collection('system_settings').doc('credentials').get();
  const key = String(doc.data()?.stripeSecretKey || '').trim();
  if (!key.startsWith('sk_')) {
    throw new Error('No se encontró stripeSecretKey válida en Firestore ni STRIPE_SECRET_KEY');
  }
  return key;
}

async function main() {
  const stripe = new Stripe(await secretKey());
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = endpoints.data.find((e) => e.url === WEBHOOK_URL);
  if (!existing) {
    const created = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: REQUIRED_EVENTS,
      connect: true,
      description: 'AutoDealers admin - membresias y afiliados Connect',
    });
    console.log('CREATED', created.id, created.enabled_events.join(','));
    return;
  }

  const missing = REQUIRED_EVENTS.filter((e) => !existing.enabled_events.includes(e));
  if (missing.length === 0 && existing.status === 'enabled') {
    console.log('OK already complete', existing.id);
    return;
  }

  const updated = await stripe.webhookEndpoints.update(existing.id, {
    enabled_events: REQUIRED_EVENTS,
    disabled: false,
    description: 'AutoDealers admin - membresias y afiliados Connect',
  });
  console.log(
    'UPDATED',
    updated.id,
    'added',
    missing.join(',') || '(none)',
    'events=',
    updated.enabled_events.join(',')
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

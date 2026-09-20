#!/usr/bin/env node
/**
 * Recrea Prices de Stripe en la cuenta actual cuando el ID guardado ya no existe
 * (p. ej. precios de otra cuenta / modo test).
 *
 *   node scripts/repair-membership-stripe-prices.mjs
 *   node scripts/repair-membership-stripe-prices.mjs --dry-run
 */

import admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const DRY = process.argv.includes('--dry-run');

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

function flattenStripe(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}[${key}]` : key;
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      flattenStripe(value, next, out);
    } else if (value != null) {
      out[next] = String(value);
    }
  }
  return out;
}

async function stripeRequest(secret, method, path, body) {
  const headers = { Authorization: `Bearer ${secret}` };
  const init = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(flattenStripe(body)).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1/${path}`, init);
  const json = await res.json();
  return { status: res.status, json };
}

async function priceExists(secret, priceId) {
  if (!priceId || !String(priceId).startsWith('price_')) return false;
  const r = await stripeRequest(secret, 'GET', `prices/${encodeURIComponent(priceId)}`);
  return r.status === 200 && r.json?.id === priceId && r.json.active !== false;
}

async function productExists(secret, productId) {
  if (!productId || !String(productId).startsWith('prod_')) return false;
  const r = await stripeRequest(secret, 'GET', `products/${encodeURIComponent(productId)}`);
  return r.status === 200 && r.json?.id === productId;
}

async function createPrice(secret, { name, type, kind, amount, currency, interval, membershipId, productId }) {
  let pid = productId;
  if (!pid) {
    const product = await stripeRequest(secret, 'POST', 'products', {
      name: `${name} (${kind}) - ${
        type === 'seller' ? 'Vendedor' : type === 'business' ? 'Negocio automotriz' : 'Dealer'
      }`,
      description:
        type === 'business'
          ? `Membresía mensual para talleres, gomeras y servicios automotrices · ${name}`
          : `Plan ${name} · ${kind}`,
      metadata: { managedBy: 'autodealers', type, priceKind: kind, membershipId },
    });
    if (!product.json?.id) {
      throw new Error(product.json?.error?.message || 'No se pudo crear product');
    }
    pid = product.json.id;
  }

  const price = await stripeRequest(secret, 'POST', 'prices', {
    product: pid,
    unit_amount: String(amount),
    currency: currency.toLowerCase(),
    recurring: { interval },
    metadata: { managedBy: 'autodealers', type, priceKind: kind, membershipId },
  });
  if (!price.json?.id) {
    throw new Error(price.json?.error?.message || 'No se pudo crear price');
  }
  return { stripeProductId: pid, stripePriceId: price.json.id };
}

async function main() {
  const creds = await db.collection('system_settings').doc('credentials').get();
  const secret = String(creds.data()?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secret.startsWith('sk_')) {
    console.error('No hay stripeSecretKey válida en Firestore ni STRIPE_SECRET_KEY');
    process.exit(1);
  }

  const acct = await stripeRequest(secret, 'GET', 'account');
  const accountId = acct.json?.id || '?';
  console.log(`Cuenta Stripe: ${accountId}  modo=${secret.startsWith('sk_live') ? 'live' : 'test'}  dry=${DRY}\n`);

  const snap = await db.collection('memberships').get();
  let repaired = 0;
  let okCount = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const price = Number(data.price || 0);
    const active = data.isActive !== false && data.status !== 'inactive';
    const type =
      data.type === 'seller' ? 'seller' : data.type === 'dealer' ? 'dealer' : data.type === 'business' ? 'business' : null;
    if (!type || !active || !(price > 0)) {
      skipped++;
      continue;
    }

    const fields = [
      { key: 'stripePriceId', kind: 'regular', amount: Math.round(price * 100) },
    ];
    const launch = Number(data.launchPrice || 0);
    if (launch > 0 && data.launchStripePriceId) {
      fields.push({ key: 'launchStripePriceId', kind: 'launch', amount: Math.round(launch * 100) });
    }
    const intro = Number(data.introPrice || 0);
    if (intro > 0 && data.introStripePriceId) {
      fields.push({ key: 'introStripePriceId', kind: 'intro', amount: Math.round(intro * 100) });
    }

    const patch = {};
    let productId = String(data.stripeProductId || '').trim();
    if (productId && !(await productExists(secret, productId))) {
      console.log(`  ${doc.id} product huérfano ${productId} — se crea uno nuevo`);
      productId = '';
    }

    for (const field of fields) {
      const current = String(data[field.key] || '').trim();
      if (current && (await priceExists(secret, current))) {
        okCount++;
        continue;
      }
      console.log(
        `${DRY ? 'DRY' : 'FIX'} ${data.name} (${type}) ${field.kind} $${field.amount / 100}  ${current || '(vacío)'} → recrear`
      );
      if (DRY) {
        repaired++;
        continue;
      }
      const created = await createPrice(secret, {
        name: String(data.name || 'Plan'),
        type,
        kind: field.kind,
        amount: field.amount,
        currency: String(data.currency || 'USD'),
        interval: data.billingCycle === 'yearly' ? 'year' : 'month',
        membershipId: doc.id,
        productId: productId || undefined,
      });
      patch[field.key] = created.stripePriceId;
      productId = created.stripeProductId;
      patch.stripeProductId = created.stripeProductId;
      repaired++;
    }

    if (!DRY && Object.keys(patch).length) {
      await doc.ref.set(
        {
          ...patch,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          syncVersion: admin.firestore.FieldValue.increment(1),
        },
        { merge: true }
      );
    }
  }

  console.log(`\nOK prices=${okCount}  repaired=${repaired}  skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

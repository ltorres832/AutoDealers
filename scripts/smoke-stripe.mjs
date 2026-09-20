#!/usr/bin/env node
/**
 * Smoke Stripe en producción — claves, webhooks y flujos de cada app.
 * No cobra: crea sesiones/setup intents sin completar el pago.
 *
 *   node scripts/smoke-stripe.mjs
 *   npm run smoke:stripe
 */

import admin from 'firebase-admin';
import { PLATFORM_URLS } from './platform-domains.mjs';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const URLS = {
  public: process.env.SMOKE_PUBLIC_URL || PLATFORM_URLS.public,
  admin: process.env.SMOKE_ADMIN_URL || PLATFORM_URLS.admin,
  dealer: process.env.SMOKE_DEALER_URL || PLATFORM_URLS.dealer,
  seller: process.env.SMOKE_SELLER_URL || PLATFORM_URLS.seller,
  advertiser: process.env.SMOKE_ADVERTISER_URL || PLATFORM_URLS.advertiser,
};

const API_KEYS = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.FIREBASE_WEB_API_KEY,
  'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
  'AIzaSyDlPCtTMCZy4WXvhhyPOI9fac0LjN1jo44',
].filter(Boolean);

const RUN_ID = Date.now().toString(36);
const PASSWORD = `Smoke!${RUN_ID}Aa1`;

const results = { ok: 0, fail: 0, warn: 0, details: [] };

function ok(name, detail = '') {
  results.ok++;
  console.log(`OK   ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.fail++;
  results.details.push(`FAIL ${name}: ${detail}`);
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}
function warn(name, detail = '') {
  results.warn++;
  console.warn(`WARN ${name}${detail ? ` — ${detail}` : ''}`);
}

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 35000);
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      ...opts,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* html */
    }
    return { status: res.status, json, text: text.slice(0, 400) };
  } finally {
    clearTimeout(timer);
  }
}

function api(origin, method, path, token, body) {
  return fetchJson(`${origin}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function idToken(email, password, origin) {
  let lastErr = 'login failed';
  for (const key of API_KEYS) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: `${origin}/`,
          Origin: origin,
        },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json();
    if (res.ok && data.idToken) return data.idToken;
    lastErr = data.error?.message || `HTTP ${res.status}`;
  }
  throw new Error(lastErr);
}

async function ensureAuthUser(email, displayName) {
  try {
    const user = await auth.createUser({
      email,
      password: PASSWORD,
      emailVerified: true,
      displayName,
    });
    return user;
  } catch (e) {
    if (String(e.message || e).includes('email-already-exists')) {
      const user = await auth.getUserByEmail(email);
      await auth.updateUser(user.uid, { password: PASSWORD, emailVerified: true });
      return user;
    }
    throw e;
  }
}

function pkLooksValid(key) {
  return typeof key === 'string' && /^pk_(test|live)_/.test(key) && key.length > 20;
}

async function checkPublicSurfaces() {
  console.log('\n=== Superficies públicas ===');

  {
    const r = await fetchJson(`${URLS.admin}/api/webhooks/stripe`);
    if (r.status === 200 && r.json?.ok && r.json.webhookSecretConfigured === true) {
      ok('admin webhook GET', `secret=yes endpoint=${r.json.endpoint || ''}`);
    } else if (r.status === 200 && r.json?.ok && r.json.webhookSecretConfigured === false) {
      fail('admin webhook GET', 'webhookSecretConfigured=false — falta whsec_ en Admin');
    } else {
      fail('admin webhook GET', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  {
    const r = await fetchJson(`${URLS.advertiser}/api/webhooks/stripe`);
    if (r.status === 200 && r.json?.ok) {
      if (r.json.webhookSecretConfigured === true) ok('advertiser webhook GET', 'secret=yes');
      else fail('advertiser webhook GET', 'webhookSecretConfigured=false');
    } else if (r.status === 405 || r.status === 404) {
      warn('advertiser webhook GET', `${r.status} — health GET aún no desplegado`);
    } else {
      fail('advertiser webhook GET', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  {
    const r = await fetchJson(`${URLS.advertiser}/api/webhooks/stripe`, { method: 'POST', body: '{}' });
    if (r.status === 400 && (r.json?.error === 'No signature' || /signature/i.test(r.json?.error || ''))) {
      ok('advertiser webhook POST sin firma', '400 (ruta viva)');
    } else if (r.status === 404) {
      fail('advertiser webhook POST', '404 — no existe en producción');
    } else {
      fail('advertiser webhook POST', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  for (const name of ['dealer', 'seller']) {
    const r = await fetchJson(`${URLS[name]}/api/webhooks/stripe`);
    if (r.status === 404 || r.status === 405) {
      ok(`${name} sin webhook membresía`, String(r.status));
    } else if (r.status === 200 && r.json?.ok) {
      fail(`${name} webhook`, 'no debe procesar membresías');
    } else {
      warn(`${name} webhook`, `${r.status} (esperado 404)`);
    }
  }

  {
    const r = await fetchJson(`${URLS.public}/api/public/memberships?type=dealer`);
    const list = r.json?.memberships || [];
    const withPrice = list.filter((m) => m.stripePriceId || m.checkoutStripePriceId);
    if (r.status === 200 && list.length > 0) {
      ok('membresías públicas dealer', `${list.length} planes, ${withPrice.length} con Price Stripe`);
      if (withPrice.length === 0) {
        fail('membresías con stripePriceId', 'ningún plan dealer tiene Price de Stripe');
      }
    } else {
      fail('membresías públicas dealer', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  {
    const r = await fetchJson(`${URLS.public}/api/public/memberships?type=seller`);
    const list = r.json?.memberships || [];
    const withPrice = list.filter((m) => m.stripePriceId || m.checkoutStripePriceId);
    if (r.status === 200 && list.length > 0) {
      ok('membresías públicas seller', `${list.length} planes, ${withPrice.length} con Price Stripe`);
    } else if (r.status === 200) {
      warn('membresías públicas seller', 'lista vacía');
    } else {
      fail('membresías públicas seller', `${r.status}`);
    }
  }

  {
    const r = await fetchJson(`${URLS.advertiser}/api/public/advertiser-pricing`);
    if (r.status === 200 && r.json) ok('advertiser pricing público');
    else fail('advertiser pricing público', `${r.status}`);
  }

  {
    const r = await fetchJson(`${URLS.public}/api/public/checkout/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (r.status === 400) ok('checkout create-session valida body', '400');
    else fail('checkout create-session valida body', `${r.status}`);
  }

  {
    const r = await fetchJson(`${URLS.public}/api/public/checkout/verify-session`);
    if (r.status === 400) ok('checkout verify-session sin id', '400');
    else fail('checkout verify-session sin id', `${r.status}`);
  }

  for (const [name, origin, path] of [
    ['dealer pk', URLS.dealer, '/api/settings/membership/payment/publishable-key'],
    ['seller pk', URLS.seller, '/api/settings/membership/payment/publishable-key'],
    ['advertiser pk', URLS.advertiser, '/api/advertiser/stripe/publishable-key'],
  ]) {
    const r = await fetchJson(`${origin}${path}`);
    const key = r.json?.publishableKey;
    if (r.status === 200 && pkLooksValid(key)) {
      ok(name, `${key.slice(0, 10)}…`);
    } else {
      fail(name, `${r.status} ${r.json?.error || ''}`);
    }
  }
}

async function provision() {
  const dealerEmail = `smoke-stripe-dealer-${RUN_ID}@autodealers.test`;
  const sellerEmail = `smoke-stripe-seller-${RUN_ID}@autodealers.test`;
  const adminEmail = `smoke-stripe-admin-${RUN_ID}@autodealers.test`;
  const advEmail = `smoke-stripe-adv-${RUN_ID}@autodealers.test`;

  const tenantRef = db.collection('tenants').doc();
  const tenantId = tenantRef.id;
  await tenantRef.set({
    name: `Smoke Stripe ${RUN_ID}`,
    type: 'dealer',
    status: 'active',
    membershipId: 'smoke-membership',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const dealer = await ensureAuthUser(dealerEmail, `Smoke Stripe Dealer ${RUN_ID}`);
  await db.collection('users').doc(dealer.uid).set({
    email: dealerEmail,
    name: `Smoke Stripe Dealer ${RUN_ID}`,
    role: 'dealer',
    tenantId,
    status: 'active',
    membershipId: 'smoke-membership',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const seller = await ensureAuthUser(sellerEmail, `Smoke Stripe Seller ${RUN_ID}`);
  await db.collection('users').doc(seller.uid).set({
    email: sellerEmail,
    name: `Smoke Stripe Seller ${RUN_ID}`,
    role: 'seller',
    tenantId,
    status: 'active',
    membershipId: 'smoke-membership',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const adminUser = await ensureAuthUser(adminEmail, `Smoke Stripe Admin ${RUN_ID}`);
  await db.collection('users').doc(adminUser.uid).set({
    email: adminEmail,
    name: `Smoke Stripe Admin ${RUN_ID}`,
    role: 'admin',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const advertiser = await ensureAuthUser(advEmail, `Smoke Stripe Adv ${RUN_ID}`);
  await db.collection('advertisers').doc(advertiser.uid).set({
    email: advEmail,
    companyName: `Smoke Stripe Adv ${RUN_ID}`,
    status: 'active',
    billingModel: 'pay_per_ad',
    authUserId: advertiser.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    tenantId,
    dealer: { uid: dealer.uid, email: dealerEmail },
    seller: { uid: seller.uid, email: sellerEmail },
    admin: { uid: adminUser.uid, email: adminEmail },
    advertiser: { uid: advertiser.uid, email: advEmail },
  };
}

async function cleanup(ctx) {
  const uids = [ctx?.dealer?.uid, ctx?.seller?.uid, ctx?.admin?.uid, ctx?.advertiser?.uid].filter(Boolean);
  for (const uid of uids) {
    try {
      await auth.deleteUser(uid);
    } catch {
      /* ignore */
    }
    try {
      await db.collection('users').doc(uid).delete();
    } catch {
      /* ignore */
    }
  }
  if (ctx?.advertiser?.uid) {
    try {
      await db.collection('advertisers').doc(ctx.advertiser.uid).delete();
    } catch {
      /* ignore */
    }
  }
  if (ctx?.tenantId) {
    try {
      const deals = await db.collection('tenants').doc(ctx.tenantId).collection('deals').limit(20).get();
      await Promise.all(deals.docs.map((d) => d.ref.delete()));
    } catch {
      /* ignore */
    }
    try {
      await db.collection('tenants').doc(ctx.tenantId).delete();
    } catch {
      /* ignore */
    }
  }
}

async function checkAdmin(token) {
  console.log('\n=== Admin (claves + infra) ===');

  {
    const r = await api(URLS.admin, 'POST', '/api/admin/settings/test/stripe', token, {});
    if (r.status === 200 && r.json?.success) {
      ok(
        'Probar Stripe',
        `modo=${r.json.mode} charges=${r.json.chargesEnabled} connect=${r.json.connectTransfersEnabled} whsec=${r.json.webhookSecretConfigured}`
      );
      if (!r.json.webhookSecretConfigured) fail('Probar Stripe webhook secret', 'false');
      if (r.json.chargesEnabled === false) fail('Stripe chargesEnabled', 'cuenta no puede cobrar');
    } else {
      fail('Probar Stripe', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  {
    const r = await api(URLS.admin, 'GET', '/api/admin/stripe/infrastructure', token);
    const st = r.json?.status;
    if (r.status === 200 && st) {
      ok(
        'infra Stripe',
        `mode=${st.mode} account=${st.accountId || '?'} webhookReady=${st.webhookReady} charges=${st.chargesEnabled}`
      );
      if (!st.webhookReady) {
        fail(
          'webhookReady',
          `secret=${st.webhookSecretConfigured} endpoints=${(st.webhookEndpoints || []).length} missing=${JSON.stringify(
            st.webhookEndpoints?.find((w) => w.matchesTarget)?.missingEvents || []
          )}`
        );
      }
      if (!st.chargesEnabled) fail('infra chargesEnabled', 'false');
    } else {
      fail('infra Stripe', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  {
    const r = await api(URLS.admin, 'GET', '/api/admin/stripe/dashboard', token);
    if (r.status === 200 && (r.json?.stats || r.json?.data?.stats || r.json?.success)) {
      ok('dashboard Stripe admin');
    } else {
      fail('dashboard Stripe admin', `${r.status} ${JSON.stringify(r.json || r.text).slice(0, 240)}`);
    }
  }
}

async function checkDealer(token, ctx) {
  console.log('\n=== Dealer (Connect + setup + depósito) ===');

  {
    const r = await api(URLS.dealer, 'GET', '/api/settings/connect', token);
    if (r.status === 200 && r.json?.status) {
      const ready = Boolean(r.json.ready);
      ok('Connect status', r.json.label || (ready ? 'ready' : 'not ready'));
      ctx.connectReady = ready;
    } else {
      fail('Connect status', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  {
    const r = await api(URLS.dealer, 'POST', '/api/settings/membership/payment/setup-intent', token, {});
    if (r.status === 200 && r.json?.clientSecret?.startsWith('seti_') && r.json.customerId?.startsWith('cus_')) {
      ok('dealer setup-intent', r.json.customerId);
    } else {
      fail('dealer setup-intent', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  {
    const r = await api(URLS.dealer, 'GET', '/api/settings/membership/payment/methods', token);
    if (r.status === 200) ok('dealer payment methods', `${(r.json?.paymentMethods || []).length} cards`);
    else fail('dealer payment methods', `${r.status}`);
  }

  {
    const r = await api(URLS.dealer, 'POST', '/api/deals', token, {
      vehicleId: `smoke-stripe-${RUN_ID}`,
      buyer: { fullName: 'Comprador Smoke Stripe', email: 'buyer-smoke@autodealers.test' },
      vehiclePrice: 12000,
      depositAmount: 250,
    });
    if (r.status === 201 && r.json?.deal?.id) {
      ok('crear deal depósito', r.json.deal.id);
      ctx.dealId = r.json.deal.id;
    } else {
      fail('crear deal depósito', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  if (ctx.dealId && ctx.connectReady) {
    const r = await api(URLS.dealer, 'POST', `/api/deals/${ctx.dealId}/deposit`, token, { amount: 250 });
    if (r.status === 200 && (r.json?.checkoutUrl || r.json?.url || r.json?.sessionId)) {
      ok('depósito Connect checkout', r.json.sessionId || 'url');
    } else {
      fail('depósito Connect checkout', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  } else if (ctx.dealId) {
    const r = await api(URLS.dealer, 'POST', `/api/deals/${ctx.dealId}/deposit`, token, { amount: 250 });
    if (r.status === 200 && r.json?.needsConnect) {
      ok('depósito pide Connect', 'needsConnect (sin cobrar)');
    } else if (r.status === 200 && r.json?.onboardingUrl) {
      ok('depósito pide onboarding Connect');
    } else {
      warn('depósito sin Connect listo', `${r.status} ${JSON.stringify(r.json || {}).slice(0, 180)}`);
    }
  }
}

async function checkSeller(token) {
  console.log('\n=== Seller (Connect + setup) ===');

  {
    const r = await api(URLS.seller, 'GET', '/api/settings/connect', token);
    if (r.status === 200) ok('seller Connect status', r.json?.connect ? 'ctx' : r.json?.label || 'ok');
    else fail('seller Connect status', `${r.status} ${JSON.stringify(r.json || r.text)}`);
  }

  {
    const r = await api(URLS.seller, 'POST', '/api/settings/membership/payment/setup-intent', token, {});
    if (r.status === 200 && r.json?.clientSecret?.startsWith('seti_')) {
      ok('seller setup-intent', r.json.customerId || '');
    } else {
      fail('seller setup-intent', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  {
    const r = await api(URLS.seller, 'GET', '/api/payment-methods', token);
    if (r.status === 200) ok('seller payment-methods');
    else fail('seller payment-methods', `${r.status}`);
  }
}

async function checkAdvertiser(token) {
  console.log('\n=== Advertiser (billing) ===');

  {
    const r = await api(URLS.advertiser, 'GET', '/api/advertiser/billing/payment-methods', token);
    if (r.status === 200) ok('advertiser payment-methods', `${(r.json?.paymentMethods || []).length}`);
    else fail('advertiser payment-methods', `${r.status} ${JSON.stringify(r.json || r.text)}`);
  }

  {
    const r = await api(URLS.advertiser, 'POST', '/api/advertiser/billing/setup-session', token, {
      methodType: 'card',
    });
    if (r.status === 200 && (r.json?.url || r.json?.success)) {
      ok('advertiser setup-session', 'checkout setup (sin cobro)');
    } else {
      fail('advertiser setup-session', `${r.status} ${JSON.stringify(r.json || r.text)}`);
    }
  }

  {
    const r = await api(URLS.advertiser, 'GET', '/api/advertiser/payments', token);
    if (r.status === 200) ok('advertiser payments history');
    else fail('advertiser payments history', `${r.status}`);
  }
}

async function tryMembershipCheckout(ctx, plan, accountType) {
  const user = accountType === 'seller' ? ctx.seller : ctx.dealer;
  const r = await fetchJson(`${URLS.public}/api/public/checkout/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.uid,
      membershipId: plan.id,
      accountType,
      userEmail: user.email,
      userName: `Smoke Stripe ${accountType}`,
    }),
  });

  const label = `checkout ${accountType} ${plan.name || plan.id}`;
  if (r.status === 200 && r.json?.sessionId?.startsWith('cs_') && r.json.checkoutUrl) {
    ok(label, r.json.sessionId);
    return r.json.sessionId;
  }
  fail(label, `${r.status} ${JSON.stringify(r.json || r.text)}`);
  return null;
}

async function checkMembershipCheckout(ctx) {
  console.log('\n=== Checkout membresía (public-web → Stripe) ===');

  let verifiedOnce = false;
  for (const type of ['dealer', 'seller']) {
    const rList = await fetchJson(`${URLS.public}/api/public/memberships?type=${type}`);
    const plans = (rList.json?.memberships || []).filter(
      (m) => m.isActive !== false && (m.stripePriceId || m.checkoutStripePriceId)
    );
    if (!plans.length) {
      fail(`planes ${type} con Price`, 'ninguno en catálogo público');
      continue;
    }
    for (const plan of plans) {
      const sessionId = await tryMembershipCheckout(ctx, plan, type);
      if (sessionId && !verifiedOnce) {
        const v = await fetchJson(
          `${URLS.public}/api/public/checkout/verify-session?session_id=${encodeURIComponent(sessionId)}`
        );
        if (v.status === 200 && v.json?.verified && v.json.paid === false) {
          ok('verify-session unpaid', `status=${v.json.status || 'open'} (sin cobro)`);
          verifiedOnce = true;
        } else {
          fail('verify-session', `${v.status} ${JSON.stringify(v.json || v.text)}`);
        }
      }
    }
  }
}

async function main() {
  console.log(`\nStripe smoke → ${PROJECT_ID}`);
  console.log(`  public     ${URLS.public}`);
  console.log(`  admin      ${URLS.admin}`);
  console.log(`  dealer     ${URLS.dealer}`);
  console.log(`  seller     ${URLS.seller}`);
  console.log(`  advertiser ${URLS.advertiser}\n`);

  let ctx;
  try {
    await checkPublicSurfaces();

    console.log('\n=== Provision usuarios smoke ===');
    ctx = await provision();
    ok('provision', `tenant=${ctx.tenantId}`);

    const adminToken = await idToken(ctx.admin.email, PASSWORD, URLS.admin);
    ok('admin idToken');
    const dealerToken = await idToken(ctx.dealer.email, PASSWORD, URLS.dealer);
    ok('dealer idToken');
    const sellerToken = await idToken(ctx.seller.email, PASSWORD, URLS.seller);
    ok('seller idToken');
    const advToken = Buffer.from(
      JSON.stringify({
        uid: ctx.advertiser.uid,
        role: 'advertiser',
        advertiserId: ctx.advertiser.uid,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64');
    ok('advertiser session token');

    await checkAdmin(adminToken);
    await checkDealer(dealerToken, ctx);
    await checkSeller(sellerToken);
    await checkAdvertiser(advToken);
    await checkMembershipCheckout(ctx);
  } catch (e) {
    fail('fatal', e.message || String(e));
  } finally {
    console.log('\n=== Cleanup ===');
    await cleanup(ctx);
  }

  console.log('\n==============================');
  console.log(`OK=${results.ok}  FAIL=${results.fail}  WARN=${results.warn}`);
  if (results.details.length) {
    console.log('\nFallos:');
    for (const d of results.details) console.log(` - ${d}`);
  }
  console.log('==============================\n');
  process.exit(results.fail > 0 ? 1 : 0);
}

main();

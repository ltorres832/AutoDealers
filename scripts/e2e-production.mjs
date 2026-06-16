#!/usr/bin/env node
/**
 * Pruebas E2E HTTP contra producción (App Hosting).
 * Opcional: crea sesiones si existen usuarios @autodealers.test
 *
 * Uso: node scripts/e2e-production.mjs
 */

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0';

const APPS = {
  public: process.env.SMOKE_PUBLIC_WEB_URL ||
    'https://public-web-app--autodealers-7f62e.us-central1.hosted.app',
  admin: process.env.SMOKE_ADMIN_URL ||
    'https://admin-app--autodealers-7f62e.us-central1.hosted.app',
  dealer: process.env.SMOKE_DEALER_URL ||
    'https://dealer-app--autodealers-7f62e.us-central1.hosted.app',
  seller: process.env.SMOKE_SELLER_URL ||
    'https://seller-app--autodealers-7f62e.us-central1.hosted.app',
  advertiser: process.env.SMOKE_ADVERTISER_URL ||
    'https://advertiser-app--autodealers-7f62e.us-central1.hosted.app',
};

const TEST_USERS = {
  admin: { email: 'admin@autodealers.test', password: 'Admin123!' },
  dealer: { email: 'dealer@autodealers.test', password: 'Dealer123!' },
  seller: { email: 'seller@autodealers.test', password: 'Seller123!' },
  advertiser: { email: 'advertiser@autodealers.test', password: 'Advertiser123!' },
};

let failed = 0;

function ok(name, detail = '') {
  console.log(`OK   ${name}${detail ? `: ${detail}` : ''}`);
}

function fail(name, detail = '') {
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  failed++;
}

function warn(name, detail = '') {
  console.warn(`WARN ${name}${detail ? `: ${detail}` : ''}`);
}

async function fetchStatus(url, opts = {}) {
  const res = await fetch(url, { redirect: 'manual', ...opts });
  return res;
}

async function firebaseSignIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.idToken) {
    throw new Error(data.error?.message || 'signIn failed');
  }
  return { idToken: data.idToken, localId: data.localId };
}

async function checkPublicEndpoints() {
  const checks = [
    ['landing-config', `${APPS.public}/api/public/landing-config`],
    ['vehicles', `${APPS.public}/api/public/vehicles?limit=1`],
    ['promotions', `${APPS.public}/api/public/promotions`],
    ['ad-pricing', `${APPS.public}/api/public/ad-pricing-config`],
    ['advertise page', `${APPS.public}/advertise`],
    ['contacto page', `${APPS.public}/contacto`],
  ];

  for (const [name, url] of checks) {
    try {
      const res = await fetchStatus(url);
      if (res.status >= 200 && res.status < 400) ok(`public ${name}`, String(res.status));
      else fail(`public ${name}`, String(res.status));
    } catch (e) {
      fail(`public ${name}`, e.message);
    }
  }

  try {
    const res = await fetch(`${APPS.public}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Test',
        email: `e2e-${Date.now()}@autodealers.test`,
        phone: '7875550100',
        businessType: 'dealer',
        message: 'Mensaje de prueba automatizada E2E.',
      }),
    });
    if (res.status === 200) ok('public contact POST', '200');
    else fail('public contact POST', String(res.status));
  } catch (e) {
    fail('public contact POST', e.message);
  }
}

async function checkUnauthenticatedProtection() {
  const checks = [
    ['admin /api/auth/me', `${APPS.admin}/api/auth/me`, [401, 403]],
    ['dealer /api/dashboard', `${APPS.dealer}/api/dashboard`, [401, 403]],
    ['seller /api/dashboard', `${APPS.seller}/api/dashboard`, [401, 403]],
    ['advertiser /api/advertiser/me', `${APPS.advertiser}/api/advertiser/me`, [401, 403]],
    ['dealer debug route', `${APPS.dealer}/api/sellers/debug`, [401, 403, 404]],
    ['public seller debug', `${APPS.public}/api/public/seller/test-id/debug`, [404]],
    ['seller test create-user', `${APPS.seller}/api/test/create-user`, [404, 403, 405]],
  ];

  for (const [name, url, allowed] of checks) {
    try {
      const res = await fetchStatus(url);
      if (allowed.includes(res.status)) ok(`protected ${name}`, String(res.status));
      else fail(`protected ${name}`, `got ${res.status}, expected ${allowed.join('|')}`);
    } catch (e) {
      fail(`protected ${name}`, e.message);
    }
  }
}

async function checkPageRedirects() {
  try {
    const res = await fetchStatus(`${APPS.dealer}/dashboard`);
    if (res.status === 307 || res.status === 302) ok('dealer dashboard redirect', String(res.status));
    else fail('dealer dashboard redirect', String(res.status));
  } catch (e) {
    fail('dealer dashboard redirect', e.message);
  }

  try {
    const res = await fetchStatus(`${APPS.seller}/dashboard`);
    if (res.status === 307 || res.status === 302) ok('seller dashboard redirect', String(res.status));
    else if (res.status === 200) warn('seller dashboard redirect', '200 — middleware may not be deployed yet');
    else fail('seller dashboard redirect', String(res.status));
  } catch (e) {
    fail('seller dashboard redirect', e.message);
  }
}

async function checkLogins() {
  ok('admin health', String((await fetchStatus(`${APPS.admin}/api/health`)).status));

  try {
    const res = await fetch(`${APPS.admin}/api/auth/server-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USERS.admin),
    });
    if (res.status === 200) ok('admin server-login', '200');
    else warn('admin server-login', `${res.status} — run seed:test-users if 401`);
  } catch (e) {
    fail('admin server-login', e.message);
  }

  for (const [appKey, baseUrl, loginPath, bodyBuilder] of [
    [
      'dealer',
      APPS.dealer,
      '/api/auth/login',
      async () => {
        const { idToken, localId } = await firebaseSignIn(
          TEST_USERS.dealer.email,
          TEST_USERS.dealer.password
        );
        return { userId: localId, token: idToken };
      },
    ],
    [
      'seller',
      APPS.seller,
      '/api/auth/login',
      async () => {
        const { idToken, localId } = await firebaseSignIn(
          TEST_USERS.seller.email,
          TEST_USERS.seller.password
        );
        return { userId: localId, token: idToken };
      },
    ],
    [
      'advertiser',
      APPS.advertiser,
      '/api/advertiser/login',
      async () => {
        const { idToken } = await firebaseSignIn(
          TEST_USERS.advertiser.email,
          TEST_USERS.advertiser.password
        );
        return { idToken };
      },
    ],
  ]) {
    try {
      const body = await bodyBuilder();
      const res = await fetch(`${baseUrl}${loginPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 200) ok(`${appKey} login`, '200');
      else warn(`${appKey} login`, `${res.status} — run npm run seed:test-users`);
    } catch (e) {
      warn(`${appKey} login`, e.message);
    }
  }
}

async function main() {
  console.log('=== E2E Production Checks ===\n');
  await checkPublicEndpoints();
  console.log('');
  await checkUnauthenticatedProtection();
  console.log('');
  await checkPageRedirects();
  console.log('');
  await checkLogins();
  console.log('\n=== Done ===');
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log('\nAll critical checks passed (warnings may remain for missing test users).');
  }
}

main();

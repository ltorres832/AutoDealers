#!/usr/bin/env node
/**
 * Smoke test completo contra producción (App Hosting).
 * Uso:
 *   node scripts/smoke-full-production.mjs
 *   SMOKE_PUBLIC_WEB_URL=https://... node scripts/smoke-full-production.mjs
 */
import { PLATFORM_URLS } from './platform-domains.mjs';

const HOSTED = {
  public: 'https://public-web-app--autodealers-7f62e.us-central1.hosted.app',
  admin: 'https://admin-app--autodealers-7f62e.us-central1.hosted.app',
  dealer: 'https://dealer-app--autodealers-7f62e.us-central1.hosted.app',
  seller: 'https://seller-app--autodealers-7f62e.us-central1.hosted.app',
  advertiser: 'https://advertiser-app--autodealers-7f62e.us-central1.hosted.app',
};

const APPS = {
  public: process.env.SMOKE_PUBLIC_WEB_URL || HOSTED.public,
  admin: process.env.SMOKE_ADMIN_URL || HOSTED.admin,
  dealer: process.env.SMOKE_DEALER_URL || HOSTED.dealer,
  seller: process.env.SMOKE_SELLER_URL || HOSTED.seller,
  advertiser: process.env.SMOKE_ADVERTISER_URL || HOSTED.advertiser,
};

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0';

const results = { ok: 0, fail: 0, warn: 0 };

function ok(name, detail = '') {
  results.ok++;
  console.log(`OK   ${name}${detail ? `: ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.fail++;
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
}

function warn(name, detail = '') {
  results.warn++;
  console.warn(`WARN ${name}${detail ? `: ${detail}` : ''}`);
}

async function fetchStatus(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 25000);
  try {
    return await fetch(url, { redirect: 'manual', signal: controller.signal, ...opts });
  } finally {
    clearTimeout(timer);
  }
}

async function expectStatus(name, url, allowed, opts = {}) {
  try {
    const res = await fetchStatus(url, opts);
    const statuses = Array.isArray(allowed) ? allowed : [allowed];
    if (statuses.includes(res.status)) {
      ok(name, String(res.status));
      return res;
    }
    fail(name, `got ${res.status}, expected ${statuses.join('|')}`);
    return res;
  } catch (e) {
    fail(name, e.message);
    return null;
  }
}

async function checkAppShells() {
  console.log('\n=== App shells (HTML) ===');
  const pages = [
    ['public home', `${APPS.public}/`],
    ['public register', `${APPS.public}/register`],
    ['public login', `${APPS.public}/login`],
    ['admin login', `${APPS.admin}/login`],
    ['dealer login', `${APPS.dealer}/login`],
    ['seller login', `${APPS.seller}/login`],
    ['advertiser login', `${APPS.advertiser}/login`],
  ];
  for (const [name, url] of pages) {
    await expectStatus(name, url, [200, 307, 308]);
  }
}

async function checkHealthAndPublicApis() {
  console.log('\n=== Public APIs ===');
  const getApis = [
    ['landing-config', `${APPS.public}/api/public/landing-config`],
    ['vehicles', `${APPS.public}/api/public/vehicles?limit=2`],
    ['promotions', `${APPS.public}/api/public/promotions`],
    ['memberships seller', `${APPS.public}/api/public/memberships?type=seller`],
    ['memberships dealer', `${APPS.public}/api/public/memberships?type=dealer`],
    ['site-info', `${APPS.public}/api/public/site-info`],
    ['platform-branding', `${APPS.public}/api/public/platform-branding`],
    ['ad-pricing-config', `${APPS.public}/api/public/ad-pricing-config`],
    ['featured', `${APPS.public}/api/public/featured`],
    ['banners', `${APPS.public}/api/public/banners`],
    ['sponsored-content', `${APPS.public}/api/public/sponsored-content`],
    ['reviews', `${APPS.public}/api/public/reviews`],
    ['search', `${APPS.public}/api/public/search?q=toyota`],
  ];
  for (const [name, url] of getApis) {
    await expectStatus(`public ${name}`, url, [200]);
  }

  console.log('\n=== Admin health ===');
  await expectStatus('admin /api/health', `${APPS.admin}/api/health`, [200]);
}

async function checkAuthProtection() {
  console.log('\n=== Auth protection (sin sesión) ===');
  const protectedRoutes = [
    ['admin /api/auth/me', `${APPS.admin}/api/auth/me`, [401, 403]],
    ['admin integrations settings', `${APPS.admin}/api/admin/settings/integrations`, [401, 403]],
    ['admin platform-social', `${APPS.admin}/api/admin/settings/platform-social`, [401, 403]],
    ['dealer dashboard API', `${APPS.dealer}/api/dashboard`, [401, 403]],
    ['seller dashboard API', `${APPS.seller}/api/dashboard`, [401, 403]],
    ['seller membership features', `${APPS.seller}/api/membership/features`, [401, 403]],
    ['advertiser me', `${APPS.advertiser}/api/advertiser/me`, [401, 403]],
  ];
  for (const [name, url, allowed] of protectedRoutes) {
    await expectStatus(name, url, allowed);
  }
}

async function checkRegistrationValidation() {
  console.log('\n=== Registro / subdominio (validación) ===');

  const badRegister = await fetchStatus(`${APPS.public}/api/public/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountType: 'seller' }),
  });
  if (badRegister?.status === 400) ok('register missing fields → 400', String(badRegister.status));
  else fail('register missing fields → 400', String(badRegister?.status));

  const badSubdomain = await fetchStatus(`${APPS.public}/api/public/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Test',
      email: `smoke.${Date.now()}@autodealers-test.com`,
      password: 'Test123456',
      phone: '7875550100',
      accountType: 'seller',
      subdomain: 'ab',
      acceptPlatformTerms: true,
    }),
  });
  if (badSubdomain?.status === 400) ok('register short subdomain → 400', String(badSubdomain.status));
  else fail('register short subdomain → 400', String(badSubdomain?.status));

  const checkoutNoUser = await fetchStatus(`${APPS.public}/api/public/checkout/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if ([400, 404].includes(checkoutNoUser?.status)) {
    ok('checkout missing data rejected', String(checkoutNoUser.status));
  } else {
    fail('checkout missing data rejected', String(checkoutNoUser?.status));
  }
}

async function checkSubdomainRouting() {
  console.log('\n=== Subdominio (ruta en public-web) ===');
  const fakeSlug = `smoke-${Date.now().toString(36).slice(-6)}`;
  await expectStatus(`subdomain path /${fakeSlug}`, `${APPS.public}/${fakeSlug}`, [200, 404]);
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
  if (!res.ok || !data.idToken) throw new Error(data.error?.message || 'signIn failed');
  return { idToken: data.idToken, localId: data.localId };
}

async function checkAuthenticatedFlows() {
  console.log('\n=== Login autenticado (usuarios de prueba) ===');

  const testUsers = [
    { label: 'admin', email: 'admin@autodealers.test', password: 'Admin123!' },
    { label: 'dealer', email: 'dealer@autodealers.test', password: 'Dealer123!' },
    { label: 'seller', email: 'seller@autodealers.test', password: 'Seller123!' },
  ];

  for (const u of testUsers) {
    try {
      const { idToken, localId } = await firebaseSignIn(u.email, u.password);
      ok(`firebase signIn ${u.label}`, localId.slice(0, 8) + '…');

      if (u.label === 'admin') {
        const res = await fetch(`${APPS.admin}/api/auth/server-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, password: u.password }),
        });
        if (res.status === 200) ok('admin server-login', '200');
        else warn('admin server-login', String(res.status));
      }

      if (u.label === 'dealer') {
        const res = await fetch(`${APPS.dealer}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: localId, token: idToken }),
        });
        if (res.status === 200) ok('dealer app login', '200');
        else warn('dealer app login', String(res.status));
      }

      if (u.label === 'seller') {
        const res = await fetch(`${APPS.seller}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: localId, token: idToken }),
        });
        if (res.status === 200) ok('seller app login', '200');
        else warn('seller app login', String(res.status));
      }
    } catch (e) {
      warn(`auth ${u.label}`, e.message + ' (run seed-production-test-users.mjs?)');
    }
  }
}

async function checkCustomDomains() {
  console.log('\n=== Dominios custom (DNS) ===');
  const customHosts = [
    PLATFORM_URLS.public,
    PLATFORM_URLS.admin,
    `https://www.autodealers-online.com`,
  ];
  for (const base of customHosts) {
    try {
      const res = await fetchStatus(`${base}/api/public/landing-config`.replace('/api/public/landing-config', base.includes('admin') ? '/api/health' : '/api/public/landing-config'));
      if (res.status >= 200 && res.status < 500) ok(`custom domain reachable ${new URL(base).host}`, String(res.status));
      else warn(`custom domain ${new URL(base).host}`, String(res.status));
    } catch (e) {
      warn(`custom domain ${new URL(base).host}`, e.message);
    }
  }
}

async function main() {
  console.log('=== AutoDealers Full Production Smoke Test ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('Targets:', APPS);

  await checkAppShells();
  await checkHealthAndPublicApis();
  await checkAuthProtection();
  await checkRegistrationValidation();
  await checkSubdomainRouting();
  await checkAuthenticatedFlows();
  await checkCustomDomains();

  console.log('\n=== Summary ===');
  console.log(`OK: ${results.ok}  WARN: ${results.warn}  FAIL: ${results.fail}`);
  if (results.fail > 0) process.exitCode = 1;
}

main();

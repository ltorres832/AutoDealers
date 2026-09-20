#!/usr/bin/env node
/**
 * Smoke HTTP de las 5 apps: public + admin + dealer + seller + advertiser.
 * Usuario temporal por rol. GET estáticos: 5xx = FAIL.
 *
 *   node scripts/smoke-all-apps-apis.mjs
 *   npm run smoke:all:apis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { PLATFORM_URLS } from './platform-domains.mjs';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CREDS_PATH = path.join(ROOT, 'e2e/.smoke-all-creds.json');
const URLS = {
  public: process.env.SMOKE_PUBLIC_URL || PLATFORM_URLS.public,
  admin: process.env.SMOKE_ADMIN_URL || PLATFORM_URLS.admin,
  dealer: process.env.SMOKE_DEALER_URL || PLATFORM_URLS.dealer,
  seller: process.env.SMOKE_SELLER_URL || PLATFORM_URLS.seller,
  advertiser: process.env.SMOKE_ADVERTISER_URL || PLATFORM_URLS.advertiser,
};
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const API_KEYS = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.FIREBASE_WEB_API_KEY,
  'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
  'AIzaSyDlPCtTMCZy4WXvhhyPOI9fac0LjN1jo44',
].filter(Boolean);

const results = { ok: 0, fail: 0, warn: 0, details: [] };

function ok(n, d = '') {
  results.ok++;
  console.log(`OK   ${n}${d ? ` — ${d}` : ''}`);
}
function fail(n, d = '') {
  results.fail++;
  results.details.push(`FAIL ${n}: ${d}`);
  console.error(`FAIL ${n}${d ? ` — ${d}` : ''}`);
}
function warn(n, d = '') {
  results.warn++;
  console.warn(`WARN ${n}${d ? ` — ${d}` : ''}`);
}

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });

function discoverGetRoutes(appName) {
  const apiRoot = path.join(ROOT, 'apps', appName, 'src/app/api');
  const routes = [];
  function walk(dir, urlBase) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        const seg = ent.name.startsWith('[') ? '___SKIP___' : ent.name;
        walk(full, `${urlBase}/${seg}`);
      } else if (ent.name === 'route.ts' || ent.name === 'route.js') {
        const src = fs.readFileSync(full, 'utf8');
        if (!/\bexport\s+async\s+function\s+GET\b/.test(src)) continue;
        if (urlBase.includes('___SKIP___')) continue;
        routes.push(`/api${urlBase === '' ? '' : urlBase}`);
      }
    }
  }
  walk(apiRoot, '');
  return [...new Set(routes)].sort();
}

function shouldSkip(route) {
  return /\/(cron|webhooks|debug|force-init|migrate|support-enter|support-exit|create-default|create-first|provision-voice|callback|connect|firebase-client-token)\b/i.test(
    route
  );
}

async function idToken(email, password, origin) {
  let last = 'login failed';
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
    last = data.error?.message || `HTTP ${res.status}`;
  }
  throw new Error(last);
}

async function api(origin, method, pathName, token, body, attempt = 1) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    const res = await fetch(`${origin}${pathName}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    clearTimeout(timer);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* html */
    }
    return { status: res.status, json, text: text.slice(0, 240) };
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
      return api(origin, method, pathName, token, body, attempt + 1);
    }
    return { status: 0, json: null, text: String(e.message || e) };
  }
}

function scoreGet(label, r) {
  if (r.status === 0) fail(label, `network: ${r.text}`);
  else if (r.status >= 500) fail(label, `${r.status} ${JSON.stringify(r.json || r.text).slice(0, 160)}`);
  else if ([200, 201, 204, 400, 401, 403, 404, 405].includes(r.status)) ok(label, String(r.status));
  else warn(label, String(r.status));
}

async function probeApp(name, origin, appDir, token) {
  const routes = discoverGetRoutes(appDir);
  console.log(`\n=== ${name} GET (${routes.length} rutas) → ${origin} ===`);
  for (const route of routes) {
    if (shouldSkip(route)) {
      warn(`skip ${name} ${route}`);
      continue;
    }
    const r = await api(origin, 'GET', route, token);
    scoreGet(`${name} GET ${route}`, r);
    await new Promise((x) => setTimeout(x, 25));
  }
}

const PUBLIC_GETS = [
  '/',
  '/register',
  '/login',
  '/precios',
  '/advertise',
  '/dealers',
  '/plataforma',
  '/contacto',
  '/api/public/landing-config',
  '/api/public/vehicles?limit=2',
  '/api/public/promotions',
  '/api/public/memberships?type=dealer',
  '/api/public/memberships?type=seller',
  '/api/public/site-info',
  '/api/public/platform-branding',
  '/api/public/ad-pricing-config',
  '/api/public/featured',
  '/api/public/banners',
  '/api/public/sponsored-content',
  '/api/public/reviews',
  '/api/public/search?q=toyota',
  '/api/public/exclusive-offers-config',
  '/api/public/inventory-finder-cta-config',
  '/api/public/free-listings-config',
  '/api/public/why-choose-us-config',
  '/api/public/quick-listings',
  '/api/policies?language=es',
];

async function loadCreds() {
  if (!fs.existsSync(CREDS_PATH)) {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(__dirname, 'e2e-provision-all.mjs')], {
        stdio: 'inherit',
        cwd: ROOT,
      });
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`provision exit ${code}`))));
    });
  }
  return JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
}

async function main() {
  console.log('\nALL-APPS API smoke');
  const creds = await loadCreds();
  ok('creds', creds.admin.email);

  console.log('\n=== public-web ===');
  for (const p of PUBLIC_GETS) {
    const r = await api(URLS.public, 'GET', p, null);
    if (p.startsWith('/api/')) scoreGet(`public ${p}`, r);
    else if (r.status === 200 || r.status === 301 || r.status === 302 || r.status === 307 || r.status === 308) {
      ok(`public ${p}`, String(r.status));
    } else if (r.status >= 500) fail(`public ${p}`, String(r.status));
    else warn(`public ${p}`, String(r.status));
  }

  const adminToken = creds.admin.sessionId;
  const sellerToken = await idToken(creds.seller.email, creds.seller.password, URLS.seller);
  ok('seller idToken');
  const dealerToken = await idToken(creds.dealer.email, creds.dealer.password, URLS.dealer);
  ok('dealer idToken');
  const advToken = creds.advertiser.sessionToken;

  await probeApp('admin', URLS.admin, 'admin', adminToken);
  await probeApp('seller', URLS.seller, 'seller', sellerToken);
  await probeApp('advertiser', URLS.advertiser, 'advertiser', advToken);
  await probeApp('dealer', URLS.dealer, 'dealer', dealerToken);

  console.log('\n=== Mutaciones críticas ===');
  {
    const r = await api(URLS.admin, 'POST', '/api/admin/settings/test/stripe', adminToken, {});
    if (r.status === 200 && r.json?.success) ok('admin Probar Stripe', r.json.mode);
    else fail('admin Probar Stripe', `${r.status} ${JSON.stringify(r.json || r.text).slice(0, 160)}`);
  }
  {
    const r = await api(URLS.seller, 'POST', '/api/settings/membership/payment/setup-intent', sellerToken, {});
    if (r.status === 200 && r.json?.clientSecret) ok('seller setup-intent');
    else fail('seller setup-intent', `${r.status} ${JSON.stringify(r.json || r.text).slice(0, 160)}`);
  }
  {
    const r = await api(URLS.advertiser, 'POST', '/api/advertiser/billing/setup-session', advToken, {
      methodType: 'card',
    });
    if (r.status === 200 && r.json?.url) ok('advertiser setup-session');
    else fail('advertiser setup-session', `${r.status} ${JSON.stringify(r.json || r.text).slice(0, 160)}`);
  }
  {
    const r = await api(URLS.dealer, 'POST', '/api/parts', dealerToken, {
      sku: `ALL-${Date.now().toString(36)}`,
      name: 'All-apps smoke part',
      qtyOnHand: 1,
      cost: 5,
      price: 10,
    });
    if (r.status === 201) ok('dealer POST parts');
    else fail('dealer POST parts', `${r.status}`);
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

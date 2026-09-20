#!/usr/bin/env node
/**
 * Smoke HTTP autenticado: TODAS las rutas GET del dealer + mutaciones DMS.
 * Usa usuario temporal (Firebase Admin) + Identity Toolkit.
 *
 *   node scripts/smoke-dealer-apis-full.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { PLATFORM_URLS } from './platform-domains.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEALER_ORIGIN = process.env.SMOKE_DEALER_URL || PLATFORM_URLS.dealer;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const API_KEYS = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.FIREBASE_WEB_API_KEY,
  'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
  'AIzaSyDlPCtTMCZy4WXvhhyPOI9fac0LjN1jo44',
].filter(Boolean);

const RUN_ID = Date.now().toString(36);
const EMAIL = `smoke-dealer-full-${RUN_ID}@autodealers.test`;
const PASSWORD = `Smoke!${RUN_ID}Aa1`;

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
const db = admin.firestore();
const auth = admin.auth();

function discoverGetRoutes() {
  const apiRoot = path.join(ROOT, 'apps/dealer/src/app/api');
  const routes = [];
  function walk(dir, urlBase) {
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

async function idToken(email, password) {
  let last = 'login failed';
  for (const key of API_KEYS) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: `${DEALER_ORIGIN}/`,
          Origin: DEALER_ORIGIN,
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

async function api(method, pathName, token, body, attempt = 1) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const res = await fetch(`${DEALER_ORIGIN}${pathName}`, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
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
      /* ignore */
    }
    return { status: res.status, json, text };
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
      return api(method, pathName, token, body, attempt + 1);
    }
    return { status: 0, json: null, text: String(e.message || e) };
  }
}

async function setup() {
  const tenantRef = db.collection('tenants').doc();
  const tenantId = tenantRef.id;
  await tenantRef.set({
    name: `Smoke Full ${RUN_ID}`,
    type: 'dealer',
    status: 'active',
    membershipId: 'smoke-membership',
    featuresCache: {
      dmsServiceEnabled: true,
      dmsPartsEnabled: true,
      dmsFinanceEnabled: true,
      dmsHrEnabled: true,
      compensationPortalEnabled: true,
      fiModule: true,
      crmAdvanced: true,
      automationWorkflows: true,
      advancedReports: true,
      appointmentScheduling: true,
      socialMediaEnabled: true,
      liveChat: true,
      aiEnabled: true,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const user = await auth.createUser({
    email: EMAIL,
    password: PASSWORD,
    emailVerified: true,
  });
  await db.collection('users').doc(user.uid).set({
    email: EMAIL,
    name: `Smoke Full ${RUN_ID}`,
    role: 'dealer',
    tenantId,
    status: 'active',
    membershipId: 'smoke-membership',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection('memberships').doc('smoke-membership').set(
    {
      name: 'Smoke Full',
      status: 'active',
      features: {
        dmsServiceEnabled: true,
        dmsPartsEnabled: true,
        dmsFinanceEnabled: true,
        dmsHrEnabled: true,
        compensationPortalEnabled: true,
        fiModule: true,
        crmAdvanced: true,
        automationWorkflows: true,
        advancedReports: true,
        appointmentScheduling: true,
        socialMediaEnabled: true,
        liveChat: true,
        aiEnabled: true,
        customerFiles: true,
      },
    },
    { merge: true }
  );
  return { uid: user.uid, tenantId };
}

async function cleanup(uid, tenantId) {
  try {
    if (uid) await auth.deleteUser(uid);
  } catch {
    /* ignore */
  }
  try {
    if (uid) await db.collection('users').doc(uid).delete();
    if (tenantId) await db.collection('tenants').doc(tenantId).delete();
  } catch (e) {
    warn('cleanup', e.message);
  }
}

async function main() {
  console.log(`\nDealer FULL API smoke → ${DEALER_ORIGIN}\n`);
  const routes = discoverGetRoutes();
  console.log(`GET routes discovered: ${routes.length}\n`);

  let uid;
  let tenantId;
  try {
    const setupRes = await setup();
    uid = setupRes.uid;
    tenantId = setupRes.tenantId;
    ok('setup user', EMAIL);
    const token = await idToken(EMAIL, PASSWORD);
    ok('idToken');

    // Probe all static GET APIs
    console.log('\n=== GET APIs ===');
    for (const route of routes) {
      if (route.includes('/debug') || route.includes('support-enter') || route.includes('support-exit')) {
        warn(`skip ${route}`, 'debug/support');
        continue;
      }
      const r = await api('GET', route, token);
      if (r.status === 0) fail(`GET ${route}`, `network: ${r.text}`);
      else if (r.status >= 500) fail(`GET ${route}`, String(r.status));
      else if (r.status === 404) {
        if (route.includes('/membership')) ok(`GET ${route}`, '404 expected');
        else fail(`GET ${route}`, '404');
      } else if ([200, 201, 204, 400, 401, 403].includes(r.status)) {
        ok(`GET ${route}`, String(r.status));
      } else warn(`GET ${route}`, String(r.status));
      await new Promise((x) => setTimeout(x, 40));
    }

    // Critical mutations (same as super smoke, abbreviated)
    console.log('\n=== Mutations críticas ===');
    const part = await api('POST', '/api/parts', token, {
      sku: `FULL-${RUN_ID}`,
      name: 'Full Smoke Part',
      qtyOnHand: 1,
      cost: 5,
      price: 10,
    });
    if (part.status === 201) ok('POST parts');
    else fail('POST parts', `${part.status}`);

    const inv = await api('POST', '/api/finance', token, {
      customerName: 'Full Smoke',
      total: 50,
      subtotal: 50,
    });
    if (inv.status === 201) ok('POST finance invoice');
    else fail('POST finance invoice', `${inv.status}`);

    const ro = await api('POST', '/api/service/repair-orders', token, {
      customerName: 'Full RO',
      complaints: ['test'],
    });
    if (ro.status === 201) ok('POST repair-order');
    else fail('POST repair-order', `${ro.status}`);

    const apps = await api('GET', '/api/integrations/apps', token);
    if (apps.status === 200) ok('GET integrations/apps');
    else fail('GET integrations/apps', `${apps.status}`);
  } catch (e) {
    fail('fatal', e.message || String(e));
  } finally {
    await cleanup(uid, tenantId);
  }

  console.log('\n==============================');
  console.log(`OK=${results.ok}  FAIL=${results.fail}  WARN=${results.warn}`);
  if (results.details.length) {
    console.log('\nFallos:');
    for (const d of results.details) console.log(' -', d);
  }
  console.log('==============================\n');
  process.exit(results.fail > 0 ? 1 : 0);
}

main();

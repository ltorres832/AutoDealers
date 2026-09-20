#!/usr/bin/env node
/**
 * Super smoke del app dealer (producción App Hosting).
 * - Shell HTML de rutas nav
 * - APIs DMS: 401 sin token (no 404/500)
 * - Flujo autenticado: parts → suppliers → PO → receive → stock
 * - Finance AR/caja/GL, HR hiring/payroll, service RO, apps, deals list
 *
 * Uso:
 *   node scripts/smoke-dealer-super.mjs
 *   SMOKE_DEALER_URL=https://... node scripts/smoke-dealer-super.mjs
 */

import admin from 'firebase-admin';
import { PLATFORM_URLS } from './platform-domains.mjs';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const DEALER_ORIGIN = process.env.SMOKE_DEALER_URL || PLATFORM_URLS.dealer;
const API_KEYS = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.FIREBASE_WEB_API_KEY,
  'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
  'AIzaSyDlPCtTMCZy4WXvhhyPOI9fac0LjN1jo44',
].filter(Boolean);

const RUN_ID = Date.now().toString(36);
const EMAIL = `smoke-dealer-super-${RUN_ID}@autodealers.test`;
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

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = admin.firestore();
const auth = admin.auth();

const NAV_PAGES = [
  '/login',
  '/dashboard',
  '/leads',
  '/catalog-interest',
  '/leads/kanban',
  '/tasks',
  '/workflows',
  '/inventory',
  '/documents',
  '/messages',
  '/internal-chat',
  '/public-chat',
  '/announcements',
  '/appointments',
  '/campaigns',
  '/social-posts',
  '/promotions',
  '/banners',
  '/referrals',
  '/reviews',
  '/customer-files',
  '/fi',
  '/deals',
  '/service',
  '/parts',
  '/finance',
  '/hr',
  '/fi/metrics',
  '/fi/workflows',
  '/sales-statistics',
  '/reports',
  '/users',
  '/dealers',
  '/policies',
  '/settings',
  '/settings/branding',
  '/settings/integrations',
  '/settings/integrations/api',
  '/settings/integrations/apps',
  '/settings/compensation',
  '/settings/migration',
  '/settings/voice-agent',
  '/settings/membership',
  '/sellers',
];

const API_EXPECT_401 = [
  '/api/parts',
  '/api/parts/procurement?view=suppliers',
  '/api/finance?view=invoices',
  '/api/finance/gl-export',
  '/api/hr?view=employees',
  '/api/hr/partners?view=payroll',
  '/api/service/repair-orders',
  '/api/deals',
  '/api/integrations/apps',
  '/api/settings/public-api',
  '/api/settings/connect',
  '/api/settings/compensation',
  '/api/compensation/leave',
  '/api/user',
  '/api/vehicles',
  '/api/sellers',
  '/api/leads',
];

async function fetchStatus(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 30000);
  try {
    return await fetch(url, { redirect: 'manual', signal: controller.signal, ...opts });
  } finally {
    clearTimeout(timer);
  }
}

async function idTokenForEmailPassword(email, password) {
  let lastErr = 'login failed';
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
    lastErr = data.error?.message || `HTTP ${res.status}`;
  }
  throw new Error(lastErr);
}

async function api(method, path, token, body) {
  const res = await fetchStatus(`${DEALER_ORIGIN}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* csv or html */
  }
  return { status: res.status, json, text, headers: res.headers };
}

async function setupUser() {
  const tenantRef = db.collection('tenants').doc();
  const tenantId = tenantRef.id;
  await tenantRef.set({
    name: `Smoke Dealer Super ${RUN_ID}`,
    type: 'dealer',
    status: 'active',
    membershipId: 'smoke-membership',
    featuresCache: {
      dmsServiceEnabled: true,
      dmsPartsEnabled: true,
      dmsFinanceEnabled: true,
      dmsHrEnabled: true,
      compensationPortalEnabled: true,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const user = await auth.createUser({
    email: EMAIL,
    password: PASSWORD,
    emailVerified: true,
    displayName: `Smoke Super ${RUN_ID}`,
  });

  await db.collection('users').doc(user.uid).set({
    email: EMAIL,
    name: `Smoke Super ${RUN_ID}`,
    role: 'dealer',
    tenantId,
    status: 'active',
    membershipId: 'smoke-membership',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('memberships').doc('smoke-membership').set(
    {
      name: 'Smoke',
      features: {
        dmsServiceEnabled: true,
        dmsPartsEnabled: true,
        dmsFinanceEnabled: true,
        dmsHrEnabled: true,
      },
      status: 'active',
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
    if (tenantId) {
      const cols = [
        'parts',
        'parts_suppliers',
        'purchase_orders',
        'ar_invoices',
        'cash_entries',
        'repair_orders',
        'hr_employees',
        'hr_job_openings',
        'hr_job_applications',
        'connected_apps',
        'outbound_webhooks',
        'deals',
      ];
      for (const c of cols) {
        const snap = await db.collection('tenants').doc(tenantId).collection(c).limit(50).get();
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        if (!snap.empty) await batch.commit();
      }
      await db.collection('tenants').doc(tenantId).delete();
      await db.collection('payroll_partner_config').doc(tenantId).delete().catch(() => {});
    }
    if (uid) await db.collection('users').doc(uid).delete();
  } catch (e) {
    warn('cleanup', e.message);
  }
}

async function checkShells() {
  console.log('\n=== 1) Page shells ===');
  for (const path of NAV_PAGES) {
    const res = await fetchStatus(`${DEALER_ORIGIN}${path}`, { timeoutMs: 45000 });
    if (!res) {
      fail(`shell ${path}`, 'no response');
      continue;
    }
    if ([200, 307, 308, 302].includes(res.status)) {
      ok(`shell ${path}`, String(res.status));
    } else if (res.status === 404) {
      fail(`shell ${path}`, '404');
    } else if (res.status >= 500) {
      fail(`shell ${path}`, String(res.status));
    } else {
      warn(`shell ${path}`, String(res.status));
    }
  }
}

async function checkUnauthApis() {
  console.log('\n=== 2) APIs sin auth (401, no 404/500) ===');
  for (const path of API_EXPECT_401) {
    const res = await fetchStatus(`${DEALER_ORIGIN}${path}`);
    if (!res) {
      fail(`unauth ${path}`, 'no response');
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      ok(`unauth ${path}`, String(res.status));
    } else if (res.status === 404) {
      fail(`unauth ${path}`, '404 — ruta no desplegada?');
    } else if (res.status >= 500) {
      fail(`unauth ${path}`, String(res.status));
    } else {
      warn(`unauth ${path}`, `got ${res.status} (esperado 401)`);
    }
  }
}

async function checkAuthFlows(token) {
  console.log('\n=== 3) Flujo autenticado DMS ===');

  {
    const r = await api('GET', '/api/user', token);
    if (r.status === 200 && r.json?.user) ok('GET /api/user', r.json.user.role);
    else fail('GET /api/user', `${r.status} ${JSON.stringify(r.json)}`);
  }

  for (const key of ['dms_service', 'dms_parts', 'dms_finance', 'dms_hr']) {
    const r = await api(
      'GET',
      `/api/feature-flags/check?dashboard=dealer&featureKey=${key}`,
      token
    );
    if (r.status === 200 && r.json?.enabled === true) ok(`flag ${key}`, 'enabled');
    else if (r.status === 200) warn(`flag ${key}`, `enabled=${r.json?.enabled}`);
    else fail(`flag ${key}`, String(r.status));
  }

  let partId;
  {
    const sku = `SMK-${RUN_ID}`;
    const r = await api('POST', '/api/parts', token, {
      sku,
      name: 'Smoke Part',
      qtyOnHand: 2,
      cost: 10,
      price: 25,
    });
    if (r.status === 201 && r.json?.part?.id) {
      partId = r.json.part.id;
      ok('POST /api/parts', partId);
    } else fail('POST /api/parts', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('GET', '/api/parts', token);
    if (r.status === 200 && Array.isArray(r.json?.parts)) ok('GET /api/parts', `${r.json.parts.length} items`);
    else fail('GET /api/parts', String(r.status));
  }

  {
    const r = await api('PATCH', '/api/parts', token, {
      id: partId,
      action: 'adjust',
      delta: 1,
      reason: 'smoke',
    });
    if (r.status === 200 && r.json?.part?.qtyOnHand === 3) ok('PATCH adjust stock', '3');
    else fail('PATCH adjust stock', `${r.status} ${JSON.stringify(r.json)}`);
  }

  let supplierId;
  let poId;
  {
    const r = await api('POST', '/api/parts/procurement', token, {
      action: 'create_supplier',
      name: `Sup Smoke ${RUN_ID}`,
      email: 'sup@test.com',
    });
    if (r.status === 201 && r.json?.supplier?.id) {
      supplierId = r.json.supplier.id;
      ok('create_supplier', supplierId);
    } else fail('create_supplier', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('GET', '/api/parts/procurement?view=suppliers', token);
    if (r.status === 200 && (r.json?.suppliers || []).length) ok('list suppliers');
    else fail('list suppliers', String(r.status));
  }

  {
    const r = await api('POST', '/api/parts/procurement', token, {
      action: 'create_po',
      supplierId,
      status: 'ordered',
      lines: [
        {
          partId,
          sku: `SMK-${RUN_ID}`,
          description: 'Smoke Part',
          qtyOrdered: 5,
          unitCost: 12,
        },
      ],
    });
    if (r.status === 201 && r.json?.order?.id) {
      poId = r.json.order.id;
      ok('create_po', r.json.order.number);
    } else fail('create_po', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('POST', '/api/parts/procurement', token, {
      action: 'receive_po',
      id: poId,
      receipts: [{ lineId: 'line_1', qty: 5 }],
    });
    if (r.status === 200 && r.json?.order?.status === 'received') ok('receive_po → stock');
    else fail('receive_po', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('GET', '/api/parts', token);
    const p = (r.json?.parts || []).find((x) => x.id === partId);
    if (p && p.qtyOnHand === 8) ok('stock after PO', '8');
    else fail('stock after PO', `qty=${p?.qtyOnHand}`);
  }

  let invoiceId;
  {
    const r = await api('POST', '/api/finance', token, {
      customerName: 'Cliente Smoke',
      total: 100,
      subtotal: 100,
      description: 'Smoke invoice',
    });
    if (r.status === 201 && r.json?.invoice?.id) {
      invoiceId = r.json.invoice.id;
      ok('create invoice', invoiceId);
    } else fail('create invoice', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('POST', '/api/finance', token, {
      action: 'payment',
      invoiceId,
      amount: 40,
      method: 'cash',
    });
    if (r.status === 201) ok('record payment');
    else fail('record payment', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('POST', '/api/finance', token, {
      action: 'cash',
      type: 'in',
      amount: 15,
      category: 'manual',
      description: 'smoke cash',
    });
    if (r.status === 201) ok('cash entry');
    else fail('cash entry', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('GET', '/api/finance?view=invoices', token);
    if (r.status === 200) ok('list invoices');
    else fail('list invoices', String(r.status));
  }

  {
    const r = await api('GET', '/api/finance/gl-export', token);
    if (r.status === 200 && Array.isArray(r.json?.entries)) {
      ok('GL preview', `${r.json.entries.length} entries`);
    } else fail('GL preview', `${r.status}`);
  }

  {
    const r = await api('GET', '/api/finance/gl-export?format=quickbooks', token);
    if (r.status === 200 && r.text.includes('Date') && r.text.includes('JournalNo')) {
      ok('GL CSV QuickBooks');
    } else fail('GL CSV QuickBooks', `${r.status}`);
  }

  {
    const r = await api('GET', '/api/finance/gl-export?format=xero', token);
    if (r.status === 200 && r.text.includes('Narration')) ok('GL CSV Xero');
    else fail('GL CSV Xero', `${r.status}`);
  }

  let roId;
  {
    const r = await api('POST', '/api/service/repair-orders', token, {
      customerName: 'RO Smoke',
      vehicleLabel: '2020 Toyota',
      complaints: ['Smoke test'],
    });
    if (r.status === 201 && r.json?.order?.id) {
      roId = r.json.order.id;
      ok('create RO', r.json.order.number || roId);
    } else fail('create RO', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('GET', '/api/service/repair-orders', token);
    if (r.status === 200) ok('list ROs');
    else fail('list ROs', String(r.status));
  }

  if (roId) {
    const r = await api('PATCH', `/api/service/repair-orders/${roId}`, token, {
      status: 'in_progress',
    });
    if (r.status === 200) ok('RO status patch');
    else fail('RO status patch', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('GET', '/api/hr?view=employees', token);
    if (r.status === 200) ok('HR employees');
    else fail('HR employees', String(r.status));
  }

  {
    const r = await api('POST', '/api/hr/partners', token, {
      action: 'save_payroll',
      partner: 'adp',
      enabled: true,
      portalUrl: 'https://example.com/payroll',
      companyCode: 'SMOKE',
    });
    if (r.status === 200 && r.json?.config?.enabled) ok('payroll config');
    else fail('payroll config', `${r.status} ${JSON.stringify(r.json)}`);
  }

  let openingId;
  {
    const r = await api('POST', '/api/hr/partners', token, {
      action: 'create_opening',
      title: 'Vendedor Smoke',
      department: 'sales',
    });
    if (r.status === 201 && r.json?.opening?.id) {
      openingId = r.json.opening.id;
      ok('job opening', openingId);
    } else fail('job opening', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('POST', '/api/hr/partners', token, {
      action: 'create_application',
      openingId,
      candidateName: 'Candidato Smoke',
      email: 'cand@test.com',
    });
    if (r.status === 201) ok('job application');
    else fail('job application', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('GET', '/api/integrations/apps', token);
    if (r.status === 200 && r.json?.catalog?.events?.length) {
      ok('integrations catalog', `${r.json.catalog.events.length} events`);
    } else fail('integrations catalog', `${r.status}`);
  }

  {
    const r = await api('POST', '/api/integrations/apps', token, {
      action: 'register',
      name: 'Smoke Zap',
      type: 'zapier',
      targetUrl: 'https://example.com/hooks/smoke',
      events: ['po.received', 'lead.created'],
    });
    if (r.status === 201 && r.json?.webhookSecret) ok('register app + secret');
    else fail('register app', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('GET', '/api/deals', token);
    if (r.status === 200) ok('list deals');
    else fail('list deals', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await api('GET', '/api/settings/compensation', token);
    if (r.status === 200) ok('compensation settings');
    else if (r.status === 404) warn('compensation settings', '404');
    else fail('compensation settings', String(r.status));
  }

  {
    const r = await api('GET', '/api/settings/connect', token);
    if (r.status === 200) ok('stripe connect status');
    else fail('stripe connect status', `${r.status}`);
  }
}

async function main() {
  console.log(`\nDealer super smoke → ${DEALER_ORIGIN}\n`);
  let uid;
  let tenantId;

  try {
    await checkShells();
    await checkUnauthApis();

    console.log('\n=== Setup usuario smoke ===');
    const setup = await setupUser();
    uid = setup.uid;
    tenantId = setup.tenantId;
    ok('create smoke user', EMAIL);

    const token = await idTokenForEmailPassword(EMAIL, PASSWORD);
    ok('firebase idToken');

    await checkAuthFlows(token);
  } catch (e) {
    fail('fatal', e.message || String(e));
  } finally {
    console.log('\n=== Cleanup ===');
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

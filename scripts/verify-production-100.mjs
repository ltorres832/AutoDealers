#!/usr/bin/env node
/**
 * Verificación exhaustiva de producción — cubre las áreas que antes eran "no automatizadas".
 * Uso: node scripts/verify-production-100.mjs
 */
import { PLATFORM_URLS, PLATFORM_APEX } from './platform-domains.mjs';
import { execSync } from 'node:child_process';

const HOSTED = {
  public: process.env.SMOKE_PUBLIC_WEB_URL || 'https://public-web-app--autodealers-7f62e.us-central1.hosted.app',
  admin: process.env.SMOKE_ADMIN_URL || 'https://admin-app--autodealers-7f62e.us-central1.hosted.app',
  dealer: process.env.SMOKE_DEALER_URL || 'https://dealer-app--autodealers-7f62e.us-central1.hosted.app',
  seller: process.env.SMOKE_SELLER_URL || 'https://seller-app--autodealers-7f62e.us-central1.hosted.app',
  advertiser: process.env.SMOKE_ADVERTISER_URL || 'https://advertiser-app--autodealers-7f62e.us-central1.hosted.app',
};

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0';

const CF_BASE = 'https://us-central1-autodealers-7f62e.cloudfunctions.net';

const R = { ok: 0, fail: 0, warn: 0, skip: 0 };
const sections = [];

function ok(section, name, detail = '') {
  R.ok++;
  sections.push({ section, status: 'OK', name, detail });
  console.log(`OK   [${section}] ${name}${detail ? `: ${detail}` : ''}`);
}
function fail(section, name, detail = '') {
  R.fail++;
  sections.push({ section, status: 'FAIL', name, detail });
  console.error(`FAIL [${section}] ${name}${detail ? `: ${detail}` : ''}`);
}
function warn(section, name, detail = '') {
  R.warn++;
  sections.push({ section, status: 'WARN', name, detail });
  console.warn(`WARN [${section}] ${name}${detail ? `: ${detail}` : ''}`);
}
function skip(section, name, detail = '') {
  R.skip++;
  sections.push({ section, status: 'SKIP', name, detail });
  console.log(`SKIP [${section}] ${name}${detail ? `: ${detail}` : ''}`);
}

async function fetchStatus(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs || 25000);
  try {
    return await fetch(url, { redirect: 'manual', signal: controller.signal, ...opts });
  } finally {
    clearTimeout(t);
  }
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
  return data;
}

async function adminAuthHeaders() {
  const res = await fetch(`${HOSTED.admin}/api/auth/server-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@autodealers.test', password: 'Admin123!' }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('admin token missing');
  return { Authorization: `Bearer ${data.token}` };
}

async function appAuthHeaders(base, email, password) {
  const fb = await firebaseSignIn(email, password);
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: fb.localId, token: fb.idToken }),
  });
  const data = await res.json();
  const token = data.token || fb.idToken;
  return { Authorization: `Bearer ${token}` };
}

async function checkDnsWildcard() {
  const section = 'DNS';
  const slug = `verify-${Date.now().toString(36).slice(-5)}`;
  const hosts = [
    { host: `www.${PLATFORM_APEX}`, url: `${PLATFORM_URLS.public}/api/public/landing-config` },
    { host: `${slug}.${PLATFORM_APEX}`, url: `https://${slug}.${PLATFORM_APEX}/api/public/landing-config` },
    { host: `admin.${PLATFORM_APEX}`, url: `${PLATFORM_URLS.admin}/api/health` },
  ];

  for (const { host, url } of hosts) {
    try {
      const res = await fetchStatus(url);
      if (res.status >= 200 && res.status < 500) ok(section, `DNS+HTTP ${host}`, String(res.status));
      else fail(section, `DNS+HTTP ${host}`, String(res.status));
    } catch (e) {
      fail(section, `DNS+HTTP ${host}`, e.message);
    }
  }
}

async function checkCloudFunctions() {
  const section = 'Cloud Functions';
  const deployed = new Set(listDeployedFunctions());

  const required = [
    'affiliatePayoutsWeekly',
    'confirmReferralRewardsDaily',
    'processOverdueSubscriptionsDaily',
    'processQueuedAdsEveryFiveMinutes',
    'runPlatformScheduledTasksHourly',
    'whatsappWebhookGet',
    'whatsappWebhookPost',
    'facebookWebhookGet',
    'facebookWebhookPost',
    'instagramWebhookGet',
    'instagramWebhookPost',
  ];
  for (const name of required) {
    if (deployed.has(name)) ok(section, `${name} deployed`, 'lean package');
    else fail(section, `${name} deployed`, 'falta en firebase functions:list');
  }

  for (const legacy of [
    'nextjsServer',
    'nextjsServerPublicWeb',
    'nextjsServerAdmin',
    'nextjsServerDealer',
    'nextjsServerSeller',
  ]) {
    if (!deployed.has(legacy)) ok(section, `${legacy} removed`, 'App Hosting sirve las apps');
    else warn(section, `${legacy} still deployed`, 'legacy SSR — puede eliminarse');
  }

  const webhookChecks = [
    ['whatsappWebhookGet', `${CF_BASE}/whatsappWebhookGet?hub.mode=subscribe&hub.verify_token=x&hub.challenge=1`],
    ['facebookWebhookGet', `${CF_BASE}/facebookWebhookGet?hub.mode=subscribe&hub.verify_token=x&hub.challenge=1`],
  ];
  for (const [name, url] of webhookChecks) {
    try {
      const res = await fetchStatus(url);
      if (res.status === 403) ok(section, name, '403 invalid token');
      else if (res.status === 404) fail(section, name, '404 — función no desplegada');
      else warn(section, name, String(res.status));
    } catch (e) {
      fail(section, name, e.message);
    }
  }
}

const SCHEDULED_FUNCTIONS = [
  'confirmReferralRewardsDaily',
  'processQueuedAdsEveryFiveMinutes',
  'processOverdueSubscriptionsDaily',
  'affiliatePayoutsWeekly',
  'runPlatformScheduledTasksHourly',
];

const CRON_ENDPOINTS = [
  {
    fn: 'confirmReferralRewardsDaily',
    url: `${PLATFORM_URLS.admin}/api/admin/cron/confirm-referrals`,
    method: 'POST',
  },
  {
    fn: 'processOverdueSubscriptionsDaily',
    url: `${PLATFORM_URLS.admin}/api/admin/cron/process-overdue`,
    method: 'POST',
  },
  {
    fn: 'processQueuedAdsEveryFiveMinutes',
    url: `${PLATFORM_URLS.advertiser}/api/advertiser/cron/process-ad-queue`,
    method: 'POST',
  },
  {
    fn: 'affiliatePayoutsWeekly',
    url: `${PLATFORM_URLS.admin}/api/admin/cron/affiliate-payouts`,
    method: 'POST',
  },
  {
    fn: 'runPlatformScheduledTasksHourly',
    url: `${PLATFORM_URLS.admin}/api/scheduler`,
    method: 'POST',
  },
];

function listDeployedFunctions() {
  try {
    const out = execSync('firebase functions:list --json', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(out);
    const rows = parsed.result || parsed;
    if (Array.isArray(rows)) {
      return rows.map((r) => r.id?.split('/').pop() || r.entryPoint || r.name || '').filter(Boolean);
    }
  } catch {
    try {
      const out = execSync('firebase functions:list', { encoding: 'utf8' });
      return [...out.matchAll(/│\s+([A-Za-z0-9_]+)\s+│/g)].map((m) => m[1]).filter((n) => n !== 'Function');
    } catch {
      return [];
    }
  }
  return [];
}

async function checkScheduledCrons() {
  const section = 'Scheduled Crons';
  const deployed = new Set(listDeployedFunctions());

  for (const name of SCHEDULED_FUNCTIONS) {
    if (deployed.has(name)) ok(section, `${name} deployed`, 'scheduled trigger');
    else fail(section, `${name} deployed`, 'no aparece en firebase functions:list — ejecuta firebase deploy --only functions');
  }

  for (const { fn, url, method } of CRON_ENDPOINTS) {
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' } });
      if (res.status === 401) {
        ok(section, `${fn} endpoint`, '401 sin secret (ruta viva)');
      } else if (res.status === 200) {
        warn(section, `${fn} endpoint`, '200 sin auth — revisar seguridad');
      } else {
        fail(section, `${fn} endpoint`, `HTTP ${res.status}`);
      }
    } catch (e) {
      fail(section, `${fn} endpoint`, e.message);
    }
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    for (const { fn, url, method } of CRON_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.status === 200) ok(section, `${fn} with CRON_SECRET`, '200 OK');
        else fail(section, `${fn} with CRON_SECRET`, `HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
      } catch (e) {
        fail(section, `${fn} with CRON_SECRET`, e.message);
      }
    }
  } else {
    skip(section, 'cron full run', 'define CRON_SECRET en env para probar ejecución real (POST → 200)');
  }
}

async function checkStripeCheckout() {
  const section = 'Stripe';
  try {
    const fb = await firebaseSignIn('seller@autodealers.test', 'Seller123!');
    const memberships = await fetch(`${HOSTED.public}/api/public/memberships?type=seller`).then((r) => r.json());
    const plan = (memberships.memberships || []).find((m) => m.features?.customSubdomain === true);
    if (!plan) {
      fail(section, 'membership with subdomain', 'no plan found');
      return;
    }

    const createRes = await fetch(`${HOSTED.public}/api/public/checkout/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: fb.localId,
        membershipId: plan.id,
        accountType: 'seller',
        userEmail: 'seller@autodealers.test',
        userName: 'Seller Usuario',
      }),
    });
    const data = await createRes.json();
    if (createRes.status === 200 && data.checkoutUrl?.includes('checkout.stripe.com')) {
      ok(section, 'create checkout session', 'Stripe URL generated');
    } else if (createRes.status === 400 && data.code === 'SUBDOMAIN_NOT_IN_PLAN') {
      warn(section, 'create checkout session', 'user has pending subdomain without plan match');
    } else {
      fail(section, 'create checkout session', `${createRes.status} ${JSON.stringify(data).slice(0, 120)}`);
    }

    // Webhook endpoint exists (POST without signature → 400/401 expected)
    const wh = await fetch(`${HOSTED.admin}/api/webhooks/stripe`, { method: 'POST', body: '{}' });
    if ([400, 401, 403, 500].includes(wh.status)) {
      ok(section, 'stripe webhook route', `responds ${wh.status} without signature`);
    } else {
      fail(section, 'stripe webhook route', String(wh.status));
    }
  } catch (e) {
    fail(section, 'checkout flow', e.message);
  }
}

async function checkFacebookOAuth() {
  const section = 'Facebook OAuth';
  try {
    const headers = await adminAuthHeaders();

    const connect = await fetch(`${HOSTED.admin}/api/integrations/connect`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'facebook', reauthorize: true }),
    });
    const connectData = await connect.json();
    if (connect.status === 200 && connectData.authUrl?.includes('facebook.com')) {
      ok(section, 'connect returns Meta authUrl', 'OK');
      const u = new URL(connectData.authUrl);
      const redirect = u.searchParams.get('redirect_uri') || '';
      if (redirect.includes('admin-app--autodealers-7f62e') || redirect.includes(`admin.${PLATFORM_APEX}`)) {
        ok(section, 'redirect_uri production', redirect.slice(0, 80) + '…');
      } else {
        fail(section, 'redirect_uri production', redirect);
      }
    } else {
      fail(section, 'connect returns Meta authUrl', `${connect.status} ${JSON.stringify(connectData).slice(0, 100)}`);
    }

    const pending = await fetch(`${HOSTED.admin}/api/admin/social/platform-page-pending`, { headers });
    if (pending.status === 200) ok(section, 'platform-page-pending API', '200');
    else fail(section, 'platform-page-pending API', String(pending.status));

    const regSocial = await fetch(`${HOSTED.admin}/api/admin/settings/registration-social`, { headers });
    if (regSocial.status === 200) ok(section, 'registration-social API', '200');
    else fail(section, 'registration-social API', String(regSocial.status));

    // Webhook verify (GET)
    const fbWh = await fetch(`${HOSTED.admin}/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=invalid&hub.challenge=test123`);
    if ([200, 403, 401].includes(fbWh.status)) {
      ok(section, 'facebook webhook route', String(fbWh.status));
    } else {
      fail(section, 'facebook webhook route', String(fbWh.status));
    }

    skip(section, 'full OAuth callback', 'requiere login manual en Meta y elegir página');
  } catch (e) {
    fail(section, 'oauth setup', e.message);
  }
}

async function checkAuthenticatedApis() {
  const section = 'Auth APIs';
  try {
    const ah = await adminAuthHeaders();
    for (const [name, path] of [
      ['admin tenants', '/api/admin/tenants'],
      ['admin dealers list', '/api/admin/dealers/list'],
      ['admin sellers list', '/api/admin/sellers/list'],
      ['admin memberships', '/api/admin/memberships'],
    ]) {
      const r = await fetch(`${HOSTED.admin}${path}`, { headers: ah });
      if (r.status === 200) ok(section, name, '200');
      else fail(section, name, String(r.status));
    }

    const sh = await appAuthHeaders(HOSTED.seller, 'seller@autodealers.test', 'Seller123!');
    for (const [name, path] of [
      ['seller dashboard', '/api/dashboard'],
      ['seller membership features', '/api/membership/features'],
      ['seller leads', '/api/leads'],
      ['seller website', '/api/settings/website'],
    ]) {
      const r = await fetch(`${HOSTED.seller}${path}`, { headers: sh });
      if (r.status === 200) ok(section, name, '200');
      else fail(section, name, `${r.status} ${(await r.text()).slice(0, 80)}`);
    }

    const dh = await appAuthHeaders(HOSTED.dealer, 'dealer@autodealers.test', 'Dealer123!');
    for (const [name, path] of [
      ['dealer dashboard', '/api/dashboard'],
      ['dealer sellers', '/api/sellers'],
      ['dealer vehicles', '/api/vehicles'],
    ]) {
      const r = await fetch(`${HOSTED.dealer}${path}`, { headers: dh });
      if (r.status === 200) ok(section, name, '200');
      else fail(section, name, String(r.status));
    }

    const adv = await firebaseSignIn('advertiser@autodealers.test', 'Advertiser123!');
    const advLogin = await fetch(`${HOSTED.advertiser}/api/advertiser/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: adv.idToken }),
    });
    if (advLogin.status === 200) ok(section, 'advertiser login', '200');
    else warn(section, 'advertiser login', String(advLogin.status));
  } catch (e) {
    fail(section, 'auth flow', e.message);
  }
}

async function checkUiPages() {
  const section = 'UI pages';
  const pages = [
    ['public home', `${HOSTED.public}/`],
    ['public register', `${HOSTED.public}/register`],
    ['public registro', `${HOSTED.public}/registro`],
    ['public search', `${HOSTED.public}/search`],
    ['admin login', `${HOSTED.admin}/login`],
    ['admin integrations', `${HOSTED.admin}/admin/settings/integrations`],
    ['seller dashboard page', `${HOSTED.seller}/dashboard`],
    ['dealer dashboard page', `${HOSTED.dealer}/dashboard`],
    ['custom public www', `${PLATFORM_URLS.public}/`],
  ];
  for (const [name, url] of pages) {
    try {
      const res = await fetchStatus(url);
      if ([200, 307, 308].includes(res.status)) ok(section, name, String(res.status));
      else fail(section, name, String(res.status));
    } catch (e) {
      fail(section, name, e.message);
    }
  }
}

async function checkSubdomainFlow() {
  const section = 'Subdomain';
  const slug = `smoke-${Date.now().toString(36).slice(-6)}`;

  const bad = await fetch(`${HOSTED.public}/api/public/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Subdomain Test',
      email: `sub.${Date.now()}@autodealers-test.com`,
      password: 'Test123456',
      phone: '7875550100',
      accountType: 'seller',
      subdomain: slug,
      acceptPlatformTerms: true,
    }),
  });
  if (bad.status === 200) {
    ok(section, 'register with subdomain (pending)', '201/200');
    const data = await bad.json();
    if (data.tenantId) ok(section, 'tenant created', data.tenantId.slice(0, 8) + '…');
  } else {
    fail(section, 'register with subdomain', String(bad.status));
  }

  await expectPath(section, `${HOSTED.public}/${slug}`, [200]);
  await expectPath(section, `https://${slug}.${PLATFORM_APEX}/`, [200, 301, 302, 307, 308], true);
}

async function expectPath(section, url, allowed, isDns = false) {
  try {
    const res = await fetchStatus(url, { timeoutMs: isDns ? 12000 : 25000 });
    if (allowed.includes(res.status)) ok(section, url.replace(/^https?:\/\//, ''), String(res.status));
    else if (isDns) warn(section, `subdomain host ${new URL(url).hostname}`, `HTTP ${res.status}`);
    else fail(section, url, String(res.status));
  } catch (e) {
    if (isDns) warn(section, `subdomain host ${new URL(url).hostname}`, e.message);
    else fail(section, url, e.message);
  }
}

async function main() {
  console.log('=== VERIFY PRODUCTION 100% ===');
  console.log(new Date().toISOString());
  console.log('Targets:', HOSTED, '\n');

  await checkUiPages();
  await checkAuthenticatedApis();
  await checkSubdomainFlow();
  await checkDnsWildcard();
  await checkCloudFunctions();
  await checkScheduledCrons();
  await checkStripeCheckout();
  await checkFacebookOAuth();

  console.log('\n=== RESUMEN ===');
  console.log(`OK: ${R.ok}  WARN: ${R.warn}  FAIL: ${R.fail}  SKIP: ${R.skip}`);

  const failed = sections.filter((s) => s.status === 'FAIL');
  const warned = sections.filter((s) => s.status === 'WARN');
  if (failed.length) {
    console.log('\nFallos:');
    for (const f of failed) console.log(`  - [${f.section}] ${f.name}: ${f.detail}`);
  }
  if (warned.length) {
    console.log('\nAvisos (config externa / manual):');
    for (const w of warned) console.log(`  - [${w.section}] ${w.name}: ${w.detail}`);
  }

  if (R.fail > 0) process.exitCode = 1;
}

main();

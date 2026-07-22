#!/usr/bin/env node
/**
 * Smoke test de Cloud Functions en producción (lean deploy).
 * No modifica datos; valida que crons/webhooks y rutas App Hosting respondan.
 */
import { execSync } from 'node:child_process';
import { PLATFORM_URLS } from './platform-domains.mjs';

const CF = process.env.CLOUD_FUNCTIONS_BASE || 'https://us-central1-autodealers-7f62e.cloudfunctions.net';

const EXPECTED_FUNCTIONS = [
  'affiliatePayoutsWeekly',
  'confirmReferralRewardsDaily',
  'facebookWebhookGet',
  'facebookWebhookPost',
  'instagramWebhookGet',
  'instagramWebhookPost',
  'processOverdueSubscriptionsDaily',
  'processQueuedAdsEveryFiveMinutes',
  'runPlatformScheduledTasksHourly',
  'whatsappWebhookGet',
  'whatsappWebhookPost',
];

const LEGACY_REMOVED = [
  'nextjsServer',
  'nextjsServerPublicWeb',
  'nextjsServerAdmin',
  'nextjsServerDealer',
  'nextjsServerSeller',
  'nextjsServerAdvertiser',
];

let passed = 0;
let failed = 0;

function ok(name, detail = '') {
  passed++;
  console.log(`OK   ${name}${detail ? `: ${detail}` : ''}`);
}
function fail(name, detail = '') {
  failed++;
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
}

async function fetchStatus(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(url, { redirect: 'manual', signal: controller.signal, ...opts });
  } finally {
    clearTimeout(t);
  }
}

function listDeployedFunctions() {
  try {
    const out = execSync('firebase functions:list', { encoding: 'utf8' });
    return [...out.matchAll(/│\s+([A-Za-z0-9_]+)\s+│/g)]
      .map((m) => m[1])
      .filter((n) => n !== 'Function');
  } catch {
    return [];
  }
}

async function main() {
  console.log('=== Cloud Functions smoke (producción) ===\n');

  const deployed = new Set(listDeployedFunctions());
  for (const fn of EXPECTED_FUNCTIONS) {
    if (deployed.has(fn)) ok(`deployed ${fn}`);
    else fail(`deployed ${fn}`, 'no aparece en firebase functions:list');
  }
  for (const fn of LEGACY_REMOVED) {
    if (!deployed.has(fn)) ok(`legacy removed ${fn}`);
    else fail(`legacy removed ${fn}`, 'aún desplegada — ejecutar firebase functions:delete');
  }

  const webhookGets = [
    ['whatsappWebhookGet', `${CF}/whatsappWebhookGet`],
    ['facebookWebhookGet', `${CF}/facebookWebhookGet`],
    ['instagramWebhookGet', `${CF}/instagramWebhookGet`],
  ];
  for (const [name, url] of webhookGets) {
    const q = '?hub.mode=subscribe&hub.verify_token=smoke-invalid&hub.challenge=123';
    const res = await fetchStatus(url + q);
    if (res.status === 403) ok(`webhook ${name}`, '403 invalid token');
    else fail(`webhook ${name}`, `HTTP ${res.status}`);
  }

  const postRes = await fetchStatus(`${CF}/whatsappWebhookPost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if ([200, 400, 403, 405].includes(postRes.status)) ok('whatsappWebhookPost', `HTTP ${postRes.status}`);
  else fail('whatsappWebhookPost', `HTTP ${postRes.status}`);

  for (const fn of LEGACY_REMOVED) {
    const res = await fetchStatus(`${CF}/${fn}`);
    if (res.status === 404) ok(`legacy URL ${fn}`, '404');
    else fail(`legacy URL ${fn}`, `HTTP ${res.status} (esperado 404)`);
  }

  const cronRoutes = [
    ['confirm-referrals', `${PLATFORM_URLS.admin}/api/admin/cron/confirm-referrals`],
    ['process-overdue', `${PLATFORM_URLS.admin}/api/admin/cron/process-overdue`],
    ['affiliate-payouts', `${PLATFORM_URLS.admin}/api/admin/cron/affiliate-payouts`],
    ['scheduler', `${PLATFORM_URLS.admin}/api/scheduler`],
    ['process-ad-queue', `${PLATFORM_URLS.advertiser}/api/advertiser/cron/process-ad-queue`],
  ];
  for (const [name, url] of cronRoutes) {
    const res = await fetchStatus(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 401) ok(`cron route ${name}`, '401 sin secret');
    else fail(`cron route ${name}`, `HTTP ${res.status}`);
  }

  const appChecks = [
    ['public-web', `${PLATFORM_URLS.public}/api/public/landing-config`],
    ['admin', `${PLATFORM_URLS.admin}/api/health`],
    ['dealer', `${PLATFORM_URLS.dealer}/`],
    ['seller', `${PLATFORM_URLS.seller}/`],
    ['advertiser', `${PLATFORM_URLS.advertiser}/`],
  ];
  for (const [app, url] of appChecks) {
    try {
      const res = await fetchStatus(url);
      if (res.status >= 200 && res.status < 500) ok(`app hosting ${app}`, `HTTP ${res.status}`);
      else fail(`app hosting ${app}`, `HTTP ${res.status}`);
    } catch (e) {
      fail(`app hosting ${app}`, e.message);
    }
  }

  console.log(`\n--- Resultado: ${passed} OK, ${failed} FAIL ---`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

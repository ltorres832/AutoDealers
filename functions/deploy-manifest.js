/**
 * Artefactos mínimos requeridos en el paquete de Cloud Functions (lean deploy).
 * Las apps Next.js viven en Firebase App Hosting — no en este paquete.
 */
const path = require('path');

const ROOT_FILES = ['index.js', 'package.json', 'package-lock.json'];

const CRON_LIB_FILES = [
  'lib/referrals/confirmation-cron.js',
  'lib/affiliates/payout-cron.js',
  'lib/billing/process-overdue-cron.js',
  'lib/advertiser/process-ad-queue-cron.js',
  'lib/scheduler/platform-tasks-cron.js',
];

const WEBHOOK_LIB_FILES = [
  'lib/webhooks/whatsapp.js',
  'lib/webhooks/facebook.js',
  'lib/webhooks/instagram.js',
  'lib/webhooks/twilio-voice.js',
  'lib/webhooks/twilio-voice-recording.js',
  'lib/webhooks/public-http.js',
];

/** Webhooks de mensajería con validación estricta de tamaño/marca. */
const MESSAGING_WEBHOOK_LIB_FILES = [
  'lib/webhooks/whatsapp.js',
  'lib/webhooks/facebook.js',
  'lib/webhooks/instagram.js',
];

/** Bundles esbuild deben incluir lógica de mensajería (tamaño mínimo aprox.). */
const MIN_WEBHOOK_BYTES = 500_000;

const DEPLOYED_FUNCTION_NAMES = [
  'affiliatePayoutsWeekly',
  'confirmReferralRewardsDaily',
  'facebookWebhookGet',
  'facebookWebhookPost',
  'instagramWebhookGet',
  'instagramWebhookPost',
  'processOverdueSubscriptionsDaily',
  'processQueuedAdsEveryFiveMinutes',
  'processVoiceOutboundQueue',
  'runPlatformScheduledTasksHourly',
  'twilioVoiceInbound',
  'twilioVoiceRecording',
  'twilioVoiceStatus',
  'twilioVoiceTwiml',
  'whatsappWebhookGet',
  'whatsappWebhookPost',
];

const INDEX_EXPORTS = [
  'affiliatePayoutsWeekly',
  'confirmReferralRewardsDaily',
  'facebookWebhookGet',
  'facebookWebhookPost',
  'instagramWebhookGet',
  'instagramWebhookPost',
  'processOverdueSubscriptionsDaily',
  'processQueuedAdsEveryFiveMinutes',
  'processVoiceOutboundQueue',
  'runPlatformScheduledTasksHourly',
  'twilioVoiceInbound',
  'twilioVoiceRecording',
  'twilioVoiceStatus',
  'twilioVoiceTwiml',
  'whatsappWebhookGet',
  'whatsappWebhookPost',
];

function validateDeployPackage(functionsDir) {
  const errors = [];
  const fs = require('fs');

  for (const rel of [...ROOT_FILES, ...CRON_LIB_FILES, ...WEBHOOK_LIB_FILES]) {
    const full = path.join(functionsDir, rel);
    if (!fs.existsSync(full)) {
      errors.push(`Falta archivo requerido: ${rel}`);
    }
  }

  for (const rel of MESSAGING_WEBHOOK_LIB_FILES) {
    const stat = fs.statSync(path.join(functionsDir, rel));
    if (stat.size < MIN_WEBHOOK_BYTES) {
      errors.push(`${rel} demasiado pequeño (${stat.size} bytes) — ejecuta npm run build en functions/`);
    }
    const content = fs.readFileSync(path.join(functionsDir, rel), 'utf8');
    if (!content.includes('AutoDealersOnline')) {
      errors.push(`${rel} no contiene marca AutoDealersOnline — rebuildea webhooks`);
    }
  }

  const indexJs = fs.readFileSync(path.join(functionsDir, 'index.js'), 'utf8');
  for (const name of INDEX_EXPORTS) {
    if (!indexJs.includes(`exports.${name}`)) {
      errors.push(`index.js no exporta ${name}`);
    }
  }
  if (/exports\.nextjsServer/.test(indexJs)) {
    errors.push('index.js aún exporta nextjsServer (legacy SSR — no debe incluirse)');
  }

  let totalBytes = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
      } else {
        totalBytes += fs.statSync(full).size;
      }
    }
  };
  walk(functionsDir);

  return {
    ok: errors.length === 0,
    errors,
    totalBytes,
    totalMb: Math.round((totalBytes / 1024 / 1024) * 100) / 100,
    deployedFunctions: DEPLOYED_FUNCTION_NAMES,
  };
}

module.exports = {
  ROOT_FILES,
  CRON_LIB_FILES,
  WEBHOOK_LIB_FILES,
  DEPLOYED_FUNCTION_NAMES,
  validateDeployPackage,
};

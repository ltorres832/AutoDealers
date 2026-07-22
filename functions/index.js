/**
 * Punto de entrada de Cloud Functions.
 *
 * Las apps Next.js (public-web, admin, dealer, seller, advertiser) se sirven en
 * producción vía Firebase App Hosting — no como nextjsServer* aquí.
 * Este archivo solo exporta crons y webhooks HTTP.
 */

// Cron programado (TypeScript → lib/). Requiere `npm run build` en functions/ antes del deploy.
try {
  const { confirmReferralRewardsDaily } = require('./lib/referrals/confirmation-cron');
  exports.confirmReferralRewardsDaily = confirmReferralRewardsDaily;
} catch (err) {
  console.warn(
    'confirmReferralRewardsDaily no cargado (ejecuta npm run build en functions/):',
    err && err.message ? err.message : err
  );
}

try {
  const { affiliatePayoutsWeekly } = require('./lib/affiliates/payout-cron');
  exports.affiliatePayoutsWeekly = affiliatePayoutsWeekly;
} catch (err) {
  console.warn(
    'affiliatePayoutsWeekly no cargado (ejecuta npm run build en functions/):',
    err && err.message ? err.message : err
  );
}

try {
  const { processQueuedAdsEveryFiveMinutes } = require('./lib/advertiser/process-ad-queue-cron');
  exports.processQueuedAdsEveryFiveMinutes = processQueuedAdsEveryFiveMinutes;
} catch (err) {
  console.warn(
    'processQueuedAdsEveryFiveMinutes no cargado (ejecuta npm run build en functions/):',
    err && err.message ? err.message : err
  );
}

try {
  const { processOverdueSubscriptionsDaily } = require('./lib/billing/process-overdue-cron');
  exports.processOverdueSubscriptionsDaily = processOverdueSubscriptionsDaily;
} catch (err) {
  console.warn(
    'processOverdueSubscriptionsDaily no cargado (ejecuta npm run build en functions/):',
    err && err.message ? err.message : err
  );
}

try {
  const { runPlatformScheduledTasksHourly } = require('./lib/scheduler/platform-tasks-cron');
  exports.runPlatformScheduledTasksHourly = runPlatformScheduledTasksHourly;
} catch (err) {
  console.warn(
    'runPlatformScheduledTasksHourly no cargado (ejecuta npm run build en functions/):',
    err && err.message ? err.message : err
  );
}

try {
  const { whatsappWebhookGet, whatsappWebhookPost } = require('./lib/webhooks/whatsapp');
  exports.whatsappWebhookGet = whatsappWebhookGet;
  exports.whatsappWebhookPost = whatsappWebhookPost;
} catch (err) {
  console.warn('WhatsApp webhooks no cargados:', err && err.message ? err.message : err);
}

try {
  const { facebookWebhookGet, facebookWebhookPost } = require('./lib/webhooks/facebook');
  exports.facebookWebhookGet = facebookWebhookGet;
  exports.facebookWebhookPost = facebookWebhookPost;
} catch (err) {
  console.warn('Facebook webhooks no cargados:', err && err.message ? err.message : err);
}

try {
  const { instagramWebhookGet, instagramWebhookPost } = require('./lib/webhooks/instagram');
  exports.instagramWebhookGet = instagramWebhookGet;
  exports.instagramWebhookPost = instagramWebhookPost;
} catch (err) {
  console.warn('Instagram webhooks no cargados:', err && err.message ? err.message : err);
}

try {
  const {
    twilioVoiceInbound,
    twilioVoiceTwiml,
    twilioVoiceStatus,
    processVoiceOutboundQueue,
  } = require('./lib/webhooks/twilio-voice');
  exports.twilioVoiceInbound = twilioVoiceInbound;
  exports.twilioVoiceTwiml = twilioVoiceTwiml;
  exports.twilioVoiceStatus = twilioVoiceStatus;
  exports.processVoiceOutboundQueue = processVoiceOutboundQueue;
} catch (err) {
  console.warn('Twilio voice webhooks no cargados:', err && err.message ? err.message : err);
}

try {
  const { twilioVoiceRecording } = require('./lib/webhooks/twilio-voice-recording');
  exports.twilioVoiceRecording = twilioVoiceRecording;
} catch (err) {
  console.warn('Twilio recording webhook no cargado:', err && err.message ? err.message : err);
}

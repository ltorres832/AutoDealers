"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processQueuedAdsEveryFiveMinutes = void 0;
/**
 * Cron: procesa anuncios en cola y activa/cobra cuando hay espacios disponibles.
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const cronSecret = (0, params_1.defineSecret)('CRON_SECRET');
const DEFAULT_ADVERTISER_APP_URL = 'https://advertiser.autodealers-online.com';
exports.processQueuedAdsEveryFiveMinutes = (0, scheduler_1.onSchedule)({
    schedule: '*/5 * * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [cronSecret],
}, async () => {
    const secret = cronSecret.value().trim();
    const base = (process.env.ADVERTISER_APP_URL || DEFAULT_ADVERTISER_APP_URL).replace(/\/$/, '');
    if (!secret) {
        console.error('processQueuedAdsEveryFiveMinutes: CRON_SECRET vacío.');
        return;
    }
    const response = await fetch(`${base}/api/advertiser/cron/process-ad-queue`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
        },
    });
    const body = await response.text();
    if (!response.ok) {
        console.error('processQueuedAdsEveryFiveMinutes failed:', response.status, body);
        throw new Error(`process-ad-queue HTTP ${response.status}`);
    }
    console.log('processQueuedAdsEveryFiveMinutes OK:', body.slice(0, 500));
});
//# sourceMappingURL=process-ad-queue-cron.js.map
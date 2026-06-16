"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmReferralRewardsDaily = void 0;
/**
 * Cron diario: confirma referidos que cumplieron 14 días (recompensas al referidor).
 * Llama al endpoint del admin-app (misma lógica que packages/core).
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const cronSecret = (0, params_1.defineSecret)('CRON_SECRET');
const DEFAULT_ADMIN_APP_URL = 'https://admin-app--autodealers-7f62e.us-central1.hosted.app';
exports.confirmReferralRewardsDaily = (0, scheduler_1.onSchedule)({
    schedule: '0 3 * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [cronSecret],
}, async () => {
    const secret = cronSecret.value().trim();
    const base = (process.env.ADMIN_APP_URL || DEFAULT_ADMIN_APP_URL).replace(/\/$/, '');
    if (!secret) {
        console.error('confirmReferralRewardsDaily: CRON_SECRET vacío. Crea el secreto con: firebase functions:secrets:set CRON_SECRET');
        return;
    }
    const url = `${base}/api/admin/cron/confirm-referrals`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
        },
    });
    const body = await response.text();
    if (!response.ok) {
        console.error(`confirmReferralRewardsDaily failed: HTTP ${response.status}`, body);
        throw new Error(`Cron HTTP ${response.status}: ${body.slice(0, 500)}`);
    }
    console.log('confirmReferralRewardsDaily OK:', body);
});
//# sourceMappingURL=confirmation-cron.js.map
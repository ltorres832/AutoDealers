"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.affiliatePayoutsWeekly = void 0;
/**
 * Cron semanal: transfiere comisiones de afiliados vía Stripe Connect Express.
 * Llama al endpoint del admin-app (misma lógica que packages/core).
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const cronSecret = (0, params_1.defineSecret)('CRON_SECRET');
const DEFAULT_ADMIN_APP_URL = 'https://admin.autodealers-online.com';
exports.affiliatePayoutsWeekly = (0, scheduler_1.onSchedule)({
    schedule: '0 10 * * 1',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [cronSecret],
}, async () => {
    const secret = cronSecret.value().trim();
    const base = (process.env.ADMIN_APP_URL || DEFAULT_ADMIN_APP_URL).replace(/\/$/, '');
    if (!secret) {
        console.error('affiliatePayoutsWeekly: CRON_SECRET vacío. Crea el secreto con: firebase functions:secrets:set CRON_SECRET');
        return;
    }
    const url = `${base}/api/admin/cron/affiliate-payouts`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
        },
    });
    const body = await response.text();
    if (!response.ok) {
        console.error(`affiliatePayoutsWeekly failed: HTTP ${response.status}`, body);
        throw new Error(`Cron HTTP ${response.status}: ${body.slice(0, 500)}`);
    }
    console.log('affiliatePayoutsWeekly OK:', body);
});
//# sourceMappingURL=payout-cron.js.map
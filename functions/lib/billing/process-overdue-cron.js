"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOverdueSubscriptionsDaily = void 0;
/**
 * Cron: suspende cuentas con pagos vencidos (tras período de gracia).
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const cronSecret = (0, params_1.defineSecret)('CRON_SECRET');
const DEFAULT_ADMIN_APP_URL = 'https://admin-app--autodealers-7f62e.us-central1.hosted.app';
exports.processOverdueSubscriptionsDaily = (0, scheduler_1.onSchedule)({
    schedule: '0 6 * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [cronSecret],
}, async () => {
    const secret = cronSecret.value().trim();
    const base = (process.env.ADMIN_APP_URL || DEFAULT_ADMIN_APP_URL).replace(/\/$/, '');
    if (!secret) {
        console.error('processOverdueSubscriptionsDaily: CRON_SECRET vacío. firebase functions:secrets:set CRON_SECRET');
        return;
    }
    const url = `${base}/api/admin/cron/process-overdue`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
        },
    });
    const body = await response.text();
    if (!response.ok) {
        console.error('processOverdueSubscriptionsDaily failed:', response.status, body);
        throw new Error(`process-overdue HTTP ${response.status}`);
    }
    console.log('processOverdueSubscriptionsDaily OK:', body.slice(0, 500));
});
//# sourceMappingURL=process-overdue-cron.js.map
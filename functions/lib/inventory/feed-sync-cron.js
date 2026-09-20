"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryFeedSyncDaily = void 0;
/**
 * Cron diario: dispara sync de feeds vía Admin App Hosting (create/update, nunca delete).
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const cronSecret = (0, params_1.defineSecret)('CRON_SECRET');
const DEFAULT_ADMIN_APP_URL = 'https://admin.autodealers-online.com';
exports.inventoryFeedSyncDaily = (0, scheduler_1.onSchedule)({
    schedule: '0 6 * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 1,
    secrets: [cronSecret],
    timeoutSeconds: 540,
    memory: '512MiB',
}, async () => {
    const secret = cronSecret.value().trim();
    const base = (process.env.ADMIN_APP_URL || DEFAULT_ADMIN_APP_URL).replace(/\/$/, '');
    if (!secret) {
        console.error('inventoryFeedSyncDaily: CRON_SECRET vacío');
        return;
    }
    const url = `${base}/api/admin/cron/inventory-feeds`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
        },
    });
    const body = await response.text();
    if (!response.ok) {
        console.error(`inventoryFeedSyncDaily failed: HTTP ${response.status}`, body);
        throw new Error(`Cron HTTP ${response.status}: ${body.slice(0, 500)}`);
    }
    console.log('inventoryFeedSyncDaily OK:', body);
});
//# sourceMappingURL=feed-sync-cron.js.map
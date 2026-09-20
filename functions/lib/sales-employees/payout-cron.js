"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesEmployeePayoutsDaily = void 0;
/**
 * Cron diario: transfiere comisiones elegibles de empleados de ventas.
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const cronSecret = (0, params_1.defineSecret)('CRON_SECRET');
const DEFAULT_ADMIN_APP_URL = 'https://admin.autodealers-online.com';
exports.salesEmployeePayoutsDaily = (0, scheduler_1.onSchedule)({
    schedule: '0 11 * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [cronSecret],
}, async () => {
    const secret = cronSecret.value().trim();
    const base = (process.env.ADMIN_APP_URL || DEFAULT_ADMIN_APP_URL).replace(/\/$/, '');
    if (!secret) {
        console.error('salesEmployeePayoutsDaily: CRON_SECRET vacío');
        return;
    }
    const url = `${base}/api/admin/cron/sales-employee-payouts`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
        },
    });
    const body = await response.text();
    if (!response.ok) {
        console.error(`salesEmployeePayoutsDaily failed: HTTP ${response.status}`, body);
        throw new Error(`Cron HTTP ${response.status}: ${body.slice(0, 500)}`);
    }
    console.log('salesEmployeePayoutsDaily OK:', body);
});
//# sourceMappingURL=payout-cron.js.map
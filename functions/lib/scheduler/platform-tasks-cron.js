"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPlatformScheduledTasksHourly = void 0;
/**
 * Cron: ejecuta tareas programadas de la plataforma (IA, seguimientos, clasificación).
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const schedulerSecret = (0, params_1.defineSecret)('SCHEDULER_SECRET');
const DEFAULT_ADMIN_APP_URL = 'https://admin.autodealers-online.com';
exports.runPlatformScheduledTasksHourly = (0, scheduler_1.onSchedule)({
    schedule: '0 * * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [schedulerSecret],
}, async () => {
    const secret = schedulerSecret.value().trim();
    const base = (process.env.ADMIN_APP_URL || DEFAULT_ADMIN_APP_URL).replace(/\/$/, '');
    if (!secret) {
        console.error('runPlatformScheduledTasksHourly: SCHEDULER_SECRET vacío.');
        return;
    }
    const response = await fetch(`${base}/api/scheduler`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
        },
    });
    const body = await response.text();
    if (!response.ok) {
        console.error('runPlatformScheduledTasksHourly failed:', response.status, body);
        throw new Error(`scheduler HTTP ${response.status}`);
    }
    console.log('runPlatformScheduledTasksHourly OK:', body.slice(0, 500));
});
//# sourceMappingURL=platform-tasks-cron.js.map
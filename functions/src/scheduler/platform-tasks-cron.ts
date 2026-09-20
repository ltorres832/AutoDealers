/**
 * Cron: ejecuta tareas programadas de la plataforma (IA, seguimientos, clasificación).
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

const schedulerSecret = defineSecret('SCHEDULER_SECRET');

const DEFAULT_ADMIN_APP_URL = 'https://admin.autodealers-online.com';

export const runPlatformScheduledTasksHourly = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [schedulerSecret],
  },
  async () => {
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
  }
);

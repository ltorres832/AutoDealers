/**
 * Cron: suspende cuentas con pagos vencidos (tras período de gracia).
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

const cronSecret = defineSecret('CRON_SECRET');

const DEFAULT_ADMIN_APP_URL =
  'https://admin-app--autodealers-7f62e.us-central1.hosted.app';

export const processOverdueSubscriptionsDaily = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [cronSecret],
  },
  async () => {
    const secret = cronSecret.value().trim();
    const base = (process.env.ADMIN_APP_URL || DEFAULT_ADMIN_APP_URL).replace(/\/$/, '');

    if (!secret) {
      console.error(
        'processOverdueSubscriptionsDaily: CRON_SECRET vacío. firebase functions:secrets:set CRON_SECRET'
      );
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
  }
);

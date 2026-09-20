/**
 * Cron diario: dispara sync de feeds vía Admin App Hosting (create/update, nunca delete).
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

const cronSecret = defineSecret('CRON_SECRET');
const DEFAULT_ADMIN_APP_URL = 'https://admin.autodealers-online.com';

export const inventoryFeedSyncDaily = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 1,
    secrets: [cronSecret],
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
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
  }
);

/**
 * Cron: procesa anuncios en cola y activa/cobra cuando hay espacios disponibles.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

const cronSecret = defineSecret('CRON_SECRET');

const DEFAULT_ADVERTISER_APP_URL = 'https://advertiser.autodealers-online.com';

export const processQueuedAdsEveryFiveMinutes = onSchedule(
  {
    schedule: '*/5 * * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [cronSecret],
  },
  async () => {
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
  }
);

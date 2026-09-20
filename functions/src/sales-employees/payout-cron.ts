/**
 * Cron diario: transfiere comisiones elegibles de empleados de ventas.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

const cronSecret = defineSecret('CRON_SECRET');
const DEFAULT_ADMIN_APP_URL = 'https://admin.autodealers-online.com';

export const salesEmployeePayoutsDaily = onSchedule(
  {
    schedule: '0 11 * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 2,
    secrets: [cronSecret],
  },
  async () => {
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
  }
);

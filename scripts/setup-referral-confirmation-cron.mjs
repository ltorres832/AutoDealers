#!/usr/bin/env node
/**
 * Crea (o actualiza) un job de Cloud Scheduler que ejecuta el cron de referidos.
 *
 * PowerShell:
 *   $env:CRON_SECRET = "tu_secreto"
 *   node scripts/setup-referral-confirmation-cron.mjs
 */
import { execFileSync } from 'child_process';

const projectId =
  process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const location = process.env.SCHEDULER_LOCATION || 'us-central1';
const cronSecret = process.env.CRON_SECRET;
const adminAppUrl =
  process.env.ADMIN_APP_URL ||
  'https://admin-app--autodealers-7f62e.us-central1.hosted.app';
const jobName = process.env.SCHEDULER_JOB_NAME || 'confirm-referral-rewards-daily';

if (!cronSecret) {
  console.error('❌ Define CRON_SECRET (mismo valor que en admin-app / Firebase Functions).');
  process.exit(1);
}

const targetUrl = `${adminAppUrl.replace(/\/$/, '')}/api/admin/cron/confirm-referrals`;
const schedule = process.env.CRON_SCHEDULE || '0 3 * * *';
const timeZone = process.env.CRON_TIMEZONE || 'America/Puerto_Rico';

function gcloudArgs(command) {
  return [
    'scheduler',
    'jobs',
    command,
    'http',
    jobName,
    `--project=${projectId}`,
    `--location=${location}`,
    `--schedule=${schedule}`,
    `--time-zone=${timeZone}`,
    `--uri=${targetUrl}`,
    '--http-method=POST',
    `--headers=Authorization=Bearer ${cronSecret}`,
    '--attempt-deadline=300s',
  ];
}

function run(command) {
  execFileSync('gcloud', gcloudArgs(command), { stdio: 'inherit' });
}

try {
  run('update');
  console.log(`✅ Job actualizado: ${jobName}`);
} catch {
  run('create');
  console.log(`✅ Job creado: ${jobName}`);
}

console.log(`Programación: ${schedule} (${timeZone})`);
console.log(`URL: ${targetUrl}`);

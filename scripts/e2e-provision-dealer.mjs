#!/usr/bin/env node
/**
 * Crea un dealer temporal para Playwright y escribe e2e/.smoke-dealer-creds.json
 *   node scripts/e2e-provision-dealer.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../e2e/.smoke-dealer-creds.json');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const RUN_ID = Date.now().toString(36);
const EMAIL = process.env.E2E_DEALER_EMAIL || `e2e-dealer-${RUN_ID}@autodealers.test`;
const PASSWORD = process.env.E2E_DEALER_PASSWORD || `E2e!${RUN_ID}Aa1`;

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();

async function main() {
  // Reuse existing if file present and still valid
  if (fs.existsSync(OUT) && !process.env.E2E_FORCE_NEW) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      if (prev.email && prev.password && prev.uid) {
        await auth.getUser(prev.uid);
        console.log('Reusing existing e2e dealer', prev.email);
        return;
      }
    } catch {
      /* recreate */
    }
  }

  const tenantRef = db.collection('tenants').doc();
  const tenantId = tenantRef.id;
  await tenantRef.set({
    name: `E2E Dealer ${RUN_ID}`,
    type: 'dealer',
    status: 'active',
    isDemo: true,
    isDemoAccount: true,
    visibility: 'demo',
    membershipId: 'smoke-membership',
    featuresCache: {
      dmsServiceEnabled: true,
      dmsPartsEnabled: true,
      dmsFinanceEnabled: true,
      dmsHrEnabled: true,
      compensationPortalEnabled: true,
      fiModule: true,
      crmAdvanced: true,
      automationWorkflows: true,
      advancedReports: true,
      appointmentScheduling: true,
      socialMediaEnabled: true,
      liveChat: true,
      aiEnabled: true,
      customerFiles: true,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  let user;
  try {
    user = await auth.createUser({
      email: EMAIL,
      password: PASSWORD,
      emailVerified: true,
      displayName: `E2E Dealer ${RUN_ID}`,
    });
  } catch (e) {
    if (String(e.message || e).includes('email-already-exists')) {
      user = await auth.getUserByEmail(EMAIL);
      await auth.updateUser(user.uid, { password: PASSWORD, emailVerified: true });
    } else throw e;
  }

  await db.collection('users').doc(user.uid).set(
    {
      email: EMAIL,
      name: `E2E Dealer ${RUN_ID}`,
      role: 'dealer',
      tenantId,
      status: 'active',
      membershipId: 'smoke-membership',
      isDemo: true,
      isDemoAccount: true,
      visibility: 'demo',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await db.collection('memberships').doc('smoke-membership').set(
    {
      name: 'Smoke / E2E',
      status: 'active',
      features: {
        dmsServiceEnabled: true,
        dmsPartsEnabled: true,
        dmsFinanceEnabled: true,
        dmsHrEnabled: true,
        compensationPortalEnabled: true,
        fiModule: true,
        crmAdvanced: true,
        automationWorkflows: true,
        advancedReports: true,
        appointmentScheduling: true,
        socialMediaEnabled: true,
        liveChat: true,
        aiEnabled: true,
        customerFiles: true,
      },
    },
    { merge: true }
  );

  const payload = {
    email: EMAIL,
    password: PASSWORD,
    uid: user.uid,
    tenantId,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log('Provisioned e2e dealer →', OUT);
  console.log(EMAIL);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

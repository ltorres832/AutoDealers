#!/usr/bin/env node
/**
 * Crea usuarios temporales admin/dealer/seller/advertiser para E2E.
 * Escribe e2e/.smoke-all-creds.json y e2e/.smoke-dealer-creds.json
 */

import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ALL = path.join(__dirname, '../e2e/.smoke-all-creds.json');
const OUT_DEALER = path.join(__dirname, '../e2e/.smoke-dealer-creds.json');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const RUN_ID = Date.now().toString(36);
const PASSWORD = process.env.E2E_ALL_PASSWORD || `E2e!${RUN_ID}Aa1`;

const FEATURES = {
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
  campaigns: true,
};

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();

async function ensureUser(email, displayName) {
  try {
    const user = await auth.createUser({
      email,
      password: PASSWORD,
      emailVerified: true,
      displayName,
    });
    return user;
  } catch (e) {
    if (String(e.message || e).includes('email-already-exists')) {
      const user = await auth.getUserByEmail(email);
      await auth.updateUser(user.uid, { password: PASSWORD, emailVerified: true });
      return user;
    }
    throw e;
  }
}

async function main() {
  if (fs.existsSync(OUT_ALL) && !process.env.E2E_FORCE_NEW) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT_ALL, 'utf8'));
      if (prev.admin?.uid && prev.dealer?.uid && prev.seller?.uid && prev.advertiser?.uid) {
        await auth.getUser(prev.admin.uid);
        await auth.getUser(prev.dealer.uid);
        console.log('Reusing e2e/.smoke-all-creds.json');
        return;
      }
    } catch {
      /* recreate */
    }
  }

  await db.collection('memberships').doc('smoke-membership').set(
    { name: 'Smoke / E2E', status: 'active', isActive: true, features: FEATURES },
    { merge: true }
  );

  const tenantRef = db.collection('tenants').doc();
  const tenantId = tenantRef.id;
  await tenantRef.set({
    name: `E2E All ${RUN_ID}`,
    type: 'dealer',
    status: 'active',
    membershipId: 'smoke-membership',
    featuresCache: FEATURES,
    isDemo: true,
    isDemoAccount: true,
    visibility: 'demo',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const dealerEmail = `e2e-all-dealer-${RUN_ID}@autodealers.test`;
  const sellerEmail = `e2e-all-seller-${RUN_ID}@autodealers.test`;
  const adminEmail = `e2e-all-admin-${RUN_ID}@autodealers.test`;
  const advEmail = `e2e-all-adv-${RUN_ID}@autodealers.test`;

  const dealer = await ensureUser(dealerEmail, `E2E Dealer ${RUN_ID}`);
  await db.collection('users').doc(dealer.uid).set({
    email: dealerEmail,
    name: `E2E Dealer ${RUN_ID}`,
    role: 'dealer',
    tenantId,
    status: 'active',
    membershipId: 'smoke-membership',
    isDemo: true,
    isDemoAccount: true,
    visibility: 'demo',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const seller = await ensureUser(sellerEmail, `E2E Seller ${RUN_ID}`);
  await db.collection('users').doc(seller.uid).set({
    email: sellerEmail,
    name: `E2E Seller ${RUN_ID}`,
    role: 'seller',
    tenantId,
    status: 'active',
    membershipId: 'smoke-membership',
    billingMode: 'self_service',
    isDemo: true,
    isDemoAccount: true,
    visibility: 'demo',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const adminUser = await ensureUser(adminEmail, `E2E Admin ${RUN_ID}`);
  await db.collection('users').doc(adminUser.uid).set({
    email: adminEmail,
    name: `E2E Admin ${RUN_ID}`,
    role: 'admin',
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection('admin_users').doc(adminUser.uid).set({
    email: adminEmail,
    name: `E2E Admin ${RUN_ID}`,
    role: 'super_admin',
    permissions: ['super_admin'],
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const sessionId = randomBytes(32).toString('hex');
  await db.collection('sessions').doc(sessionId).set({
    userId: adminUser.uid,
    email: adminEmail,
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
    lastActivity: admin.firestore.FieldValue.serverTimestamp(),
  });

  const advertiser = await ensureUser(advEmail, `E2E Adv ${RUN_ID}`);
  await db.collection('advertisers').doc(advertiser.uid).set({
    email: advEmail,
    companyName: `E2E Adv ${RUN_ID}`,
    status: 'active',
    billingModel: 'pay_per_ad',
    authUserId: advertiser.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const advSession = Buffer.from(
    JSON.stringify({
      uid: advertiser.uid,
      role: 'advertiser',
      advertiserId: advertiser.uid,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    })
  ).toString('base64');

  const payload = {
    password: PASSWORD,
    tenantId,
    admin: { email: adminEmail, password: PASSWORD, uid: adminUser.uid, sessionId },
    dealer: { email: dealerEmail, password: PASSWORD, uid: dealer.uid, tenantId },
    seller: { email: sellerEmail, password: PASSWORD, uid: seller.uid, tenantId },
    advertiser: {
      email: advEmail,
      password: PASSWORD,
      uid: advertiser.uid,
      sessionToken: advSession,
    },
  };

  fs.writeFileSync(OUT_ALL, JSON.stringify(payload, null, 2));
  fs.writeFileSync(
    OUT_DEALER,
    JSON.stringify(
      { email: dealerEmail, password: PASSWORD, uid: dealer.uid, tenantId },
      null,
      2
    )
  );
  console.log('Wrote', OUT_ALL);
  console.log('  admin', adminEmail);
  console.log('  dealer', dealerEmail);
  console.log('  seller', sellerEmail);
  console.log('  advertiser', advEmail);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

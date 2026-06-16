#!/usr/bin/env node
/**
 * Crea usuarios/tenants temporales para smoke E2E en navegador.
 * Uso: node scripts/smoke-dealer-seller-setup.mjs
 * Cleanup: node scripts/smoke-dealer-seller-setup.mjs --cleanup <runId>
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const RUN_ID = process.argv.includes('--cleanup')
  ? process.argv[process.argv.indexOf('--cleanup') + 1]
  : Date.now().toString(36);

const STATE_FILE = path.join(process.cwd(), 'scripts', `.smoke-e2e-${RUN_ID}.json`);

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
const auth = admin.auth();

async function setup() {
  const dealerEmail = `smoke-dealer-${RUN_ID}@autodealers.test`;
  const sellerEmail = `smoke-seller-${RUN_ID}@autodealers.test`;
  const password = `Smoke!${RUN_ID}`;

  const dealerTenantRef = db.collection('tenants').doc();
  const sellerTenantRef = db.collection('tenants').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const dealerUser = await auth.createUser({
    email: dealerEmail,
    password,
    displayName: `Smoke Dealer ${RUN_ID}`,
  });
  const sellerUser = await auth.createUser({
    email: sellerEmail,
    password,
    displayName: `Smoke Seller ${RUN_ID}`,
  });

  await dealerTenantRef.set({
    name: `Smoke Dealer ${RUN_ID}`,
    type: 'dealer',
    ownerId: dealerUser.uid,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  await sellerTenantRef.set({
    name: `Smoke Seller ${RUN_ID}`,
    type: 'seller',
    ownerId: sellerUser.uid,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('users').doc(dealerUser.uid).set({
    email: dealerEmail,
    name: `Smoke Dealer ${RUN_ID}`,
    role: 'dealer',
    tenantId: dealerTenantRef.id,
    membershipId: '',
    membershipType: 'dealer',
    status: 'active',
    settings: {},
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('users').doc(sellerUser.uid).set({
    email: sellerEmail,
    name: `Smoke Seller ${RUN_ID}`,
    role: 'seller',
    tenantId: sellerTenantRef.id,
    membershipId: '',
    membershipType: 'seller',
    status: 'active',
    settings: {},
    createdAt: now,
    updatedAt: now,
  });

  await auth.setCustomUserClaims(dealerUser.uid, {
    role: 'dealer',
    tenantId: dealerTenantRef.id,
  });
  await auth.setCustomUserClaims(sellerUser.uid, {
    role: 'seller',
    tenantId: sellerTenantRef.id,
  });

  const membershipRef = db.collection('memberships').doc();
  const subscriptionRef = db.collection('subscriptions').doc(`smoke-sub-${RUN_ID}`);

  await membershipRef.set({
    name: 'Smoke Dealer Plan',
    type: 'dealer',
    status: 'active',
    isActive: true,
    price: 0,
    features: { maxSellers: 10, adminAssignOnly: false },
    createdAt: now,
    updatedAt: now,
  });

  await subscriptionRef.set({
    tenantId: dealerTenantRef.id,
    membershipId: membershipRef.id,
    status: 'active',
    cancelAtPeriodEnd: false,
    currentPeriodStart: now,
    currentPeriodEnd: now,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('tenants').doc(dealerTenantRef.id).update({
    membershipId: membershipRef.id,
    subscriptionStatus: 'active',
    updatedAt: now,
  });

  await db.collection('users').doc(dealerUser.uid).update({
    membershipId: membershipRef.id,
    updatedAt: now,
  });

  await db.collection('users').doc(sellerUser.uid).update({
    adminMembershipAccess: 'granted',
    updatedAt: now,
  });

  const state = {
    runId: RUN_ID,
    dealerEmail,
    sellerEmail,
    password,
    dealerUid: dealerUser.uid,
    sellerUid: sellerUser.uid,
    dealerTenantId: dealerTenantRef.id,
    sellerTenantId: sellerTenantRef.id,
    membershipId: membershipRef.id,
    subscriptionId: `smoke-sub-${RUN_ID}`,
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2));
}

async function cleanup() {
  if (!fs.existsSync(STATE_FILE)) {
    console.error('State file not found:', STATE_FILE);
    process.exit(1);
  }
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

  const invites = await db
    .collection('dealer_seller_invites')
    .where('dealerTenantId', '==', state.dealerTenantId)
    .get()
    .catch(() => ({ docs: [] }));
  for (const doc of invites.docs) await doc.ref.delete().catch(() => {});

  const inviteCodes = await db
    .collection('dealer_seller_invite_codes')
    .where('dealerTenantId', '==', state.dealerTenantId)
    .get()
    .catch(() => ({ docs: [] }));
  for (const doc of inviteCodes.docs) await doc.ref.delete().catch(() => {});

  if (state.subscriptionId) {
    await db.collection('subscriptions').doc(state.subscriptionId).delete().catch(() => {});
  }

  const links = await db
    .collection('dealer_seller_links')
    .where('dealerTenantId', '==', state.dealerTenantId)
    .get()
    .catch(() => ({ docs: [] }));
  for (const doc of links.docs) await doc.ref.delete().catch(() => {});

  await db.collection('memberships').doc(state.membershipId).delete().catch(() => {});
  await db.collection('users').doc(state.dealerUid).delete().catch(() => {});
  await db.collection('users').doc(state.sellerUid).delete().catch(() => {});
  await db.collection('tenants').doc(state.dealerTenantId).delete().catch(() => {});
  await db.collection('tenants').doc(state.sellerTenantId).delete().catch(() => {});
  await auth.deleteUser(state.dealerUid).catch(() => {});
  await auth.deleteUser(state.sellerUid).catch(() => {});

  fs.unlinkSync(STATE_FILE);
  console.log('cleanup ok', RUN_ID);
}

if (process.argv.includes('--cleanup')) {
  cleanup().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  setup().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

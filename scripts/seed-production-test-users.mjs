#!/usr/bin/env node
/**
 * Crea o actualiza usuarios de prueba en Firebase (producción autodealers-7f62e).
 * Requiere credenciales: GOOGLE_APPLICATION_CREDENTIALS o gcloud application-default login.
 *
 * Uso: node scripts/seed-production-test-users.mjs
 */

import admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const TEST_TENANT_ID = 'test-tenant-1';

const TEST_USERS = [
  {
    email: 'admin@autodealers.test',
    password: 'Admin123!',
    role: 'admin',
    name: 'Admin Usuario',
    tenantId: null,
    membershipId: 'admin-membership',
    membershipType: 'dealer',
  },
  {
    email: 'dealer@autodealers.test',
    password: 'Dealer123!',
    role: 'dealer',
    name: 'Dealer Usuario',
    tenantId: TEST_TENANT_ID,
    membershipId: 'dealer-membership',
    membershipType: 'dealer',
  },
  {
    email: 'seller@autodealers.test',
    password: 'Seller123!',
    role: 'seller',
    name: 'Seller Usuario',
    tenantId: TEST_TENANT_ID,
    membershipId: 'seller-membership',
    membershipType: 'seller',
  },
  {
    email: 'advertiser@autodealers.test',
    password: 'Advertiser123!',
    role: 'advertiser',
    name: 'Advertiser Usuario',
    tenantId: null,
    membershipId: null,
    membershipType: null,
  },
];

function initAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  return { auth: admin.auth(), db: admin.firestore() };
}

async function ensureTestTenant(db, dealerUid) {
  const ref = db.collection('tenants').doc(TEST_TENANT_ID);
  await ref.set(
    {
      id: TEST_TENANT_ID,
      name: 'Test Dealer AutoDealers',
      type: 'dealer',
      status: 'active',
      ownerId: dealerUid,
      subdomain: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function upsertAuthUser(auth, userData) {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(userData.email);
    await auth.updateUser(userRecord.uid, {
      password: userData.password,
      displayName: userData.name,
      disabled: false,
    });
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') throw err;
    userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
    });
  }

  const claims = { role: userData.role };
  if (userData.tenantId) claims.tenantId = userData.tenantId;
  if (userData.role === 'dealer' && userData.tenantId) {
    claims.dealerId = userRecord.uid;
  }
  await auth.setCustomUserClaims(userRecord.uid, claims);

  return userRecord;
}

async function upsertAdminUser(db, uid, userData) {
  await db.collection('admin_users').doc(uid).set(
    {
      email: userData.email,
      name: userData.name,
      role: 'super_admin',
      permissions: ['super_admin'],
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'seed-script',
    },
    { merge: true }
  );
}

async function upsertFirestoreUser(db, uid, userData) {
  const doc = {
    id: uid,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (userData.tenantId) doc.tenantId = userData.tenantId;
  if (userData.membershipId) doc.membershipId = userData.membershipId;
  if (userData.membershipType) doc.membershipType = userData.membershipType;
  doc.createdAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection('users').doc(uid).set(doc, { merge: true });
}

async function upsertAdvertiser(db, uid, userData) {
  await db
    .collection('advertisers')
    .doc(uid)
    .set(
      {
        email: userData.email,
        companyName: 'Test Advertiser Co',
        contactName: userData.name,
        phone: '',
        website: '',
        industry: 'automotive',
        status: 'active',
        plan: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

async function main() {
  const { auth, db } = initAdmin();
  const results = [];

  let dealerUid = null;

  for (const userData of TEST_USERS) {
    try {
      const userRecord = await upsertAuthUser(auth, userData);
      if (userData.role === 'dealer') dealerUid = userRecord.uid;

      if (userData.role === 'advertiser') {
        await upsertAdvertiser(db, userRecord.uid, userData);
      } else if (userData.role === 'admin') {
        await upsertFirestoreUser(db, userRecord.uid, userData);
        await upsertAdminUser(db, userRecord.uid, userData);
      } else {
        await upsertFirestoreUser(db, userRecord.uid, userData);
      }

      results.push({ email: userData.email, role: userData.role, uid: userRecord.uid, status: 'ok' });
      console.log(`OK   ${userData.email} (${userData.role})`);
    } catch (err) {
      results.push({
        email: userData.email,
        role: userData.role,
        status: 'error',
        error: err?.message || String(err),
      });
      console.error(`FAIL ${userData.email}:`, err?.message || err);
    }
  }

  if (dealerUid) {
    try {
      await ensureTestTenant(db, dealerUid);
      console.log(`OK   tenant ${TEST_TENANT_ID}`);
    } catch (err) {
      console.error(`FAIL tenant:`, err?.message || err);
    }
  }

  console.log('\n--- Resumen ---');
  console.log(JSON.stringify(results, null, 2));

  const failed = results.filter((r) => r.status === 'error').length;
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

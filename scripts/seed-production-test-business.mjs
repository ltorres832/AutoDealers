#!/usr/bin/env node
/**
 * Crea o actualiza el negocio automotriz de prueba en producción (autodealers-7f62e).
 * Publica la ficha para /servicios y deja credenciales para business.autodealers-online.com.
 *
 * Uso: node scripts/seed-production-test-business.mjs
 */
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';
import admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const TEST_TENANT_ID = 'test-business-1';
const TEST_EMAIL = 'business@autodealers.test';
const TEST_PASSWORD = 'Business123!';
const BUSINESS_NAME = 'Taller Demo AutoDealers';
const BUSINESS_SLUG = 'taller-demo-autodealers';
const CATEGORY_SLUG = 'talleres-mecanicos';

function initAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  return { auth: admin.auth(), db: admin.firestore() };
}

function appEmailKey(appKey, email) {
  return `${appKey}_${createHash('sha256').update(email).digest('hex')}`;
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, 210_000, 32, 'sha256').toString('hex');
  return { algorithm: 'pbkdf2-sha256', iterations: 210_000, salt, hash };
}

async function resolveBusinessMembershipId(db) {
  const snap = await db.collection('memberships').where('type', '==', 'business').get();
  const plans = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.isActive !== false)
    .sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  const pro =
    plans.find((p) => Number(p.price) === 59) ||
    plans.find((p) => String(p.name || '').toLowerCase().includes('pro')) ||
    plans[0];
  if (!pro) throw new Error('No hay membresías type=business en Firestore');
  return { id: pro.id, name: pro.name, price: pro.price };
}

async function upsertAuthUser(auth, email, password, name) {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, {
      password,
      displayName: name,
      disabled: false,
    });
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') throw err;
    userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });
  }
  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'automotive_business',
    tenantId: TEST_TENANT_ID,
  });
  return userRecord;
}

async function main() {
  const { auth, db } = initAdmin();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const membership = await resolveBusinessMembershipId(db);
  const userRecord = await upsertAuthUser(auth, TEST_EMAIL, TEST_PASSWORD, 'Usuario Taller Demo');

  await db.collection('users').doc(userRecord.uid).set(
    {
      id: userRecord.uid,
      email: TEST_EMAIL,
      authUserId: userRecord.uid,
      name: 'Usuario Taller Demo',
      role: 'automotive_business',
      tenantId: TEST_TENANT_ID,
      membershipId: membership.id,
      membershipType: 'business',
      status: 'active',
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );

  const hashed = hashPassword(TEST_PASSWORD);
  await db.collection('app_password_credentials').doc(appEmailKey('business', TEST_EMAIL)).set(
    {
      appKey: 'business',
      email: TEST_EMAIL,
      userId: userRecord.uid,
      authUserId: userRecord.uid,
      ...hashed,
      source: 'admin',
      updatedAt: new Date(),
      createdAt: new Date(),
    },
    { merge: true }
  );

  await db.collection('tenants').doc(TEST_TENANT_ID).set(
    {
      id: TEST_TENANT_ID,
      name: BUSINESS_NAME,
      companyName: BUSINESS_NAME,
      type: 'automotive_business',
      status: 'active',
      ownerId: userRecord.uid,
      membershipId: membership.id,
      slug: BUSINESS_SLUG,
      categorySlug: CATEGORY_SLUG,
      moduleKey: 'mechanic',
      description:
        'Taller de prueba en San Juan. Diagnóstico, frenos, aceite y mantenimiento general.',
      municipality: 'San Juan',
      city: 'San Juan',
      address: 'Ave. Ponce de León 1000, San Juan, PR',
      contactPhone: '787-555-0101',
      contactEmail: TEST_EMAIL,
      published: true,
      verified: true,
      mobileService: false,
      subdomain: null,
      settings: {
        hours: 'Lun-Vie 8:00am-5:00pm',
        vertical: {},
      },
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );

  const periodStart = admin.firestore.Timestamp.now();
  const periodEnd = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  );
  await db.collection('subscriptions').doc('test-business-1-sub').set(
    {
      tenantId: TEST_TENANT_ID,
      userId: userRecord.uid,
      membershipId: membership.id,
      status: 'active',
      billingSource: 'admin_grant',
      cancelAtPeriodEnd: false,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      updatedAt: periodStart,
    },
    { merge: true }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        loginUrl: 'https://business.autodealers-online.com/login',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        businessName: BUSINESS_NAME,
        slug: BUSINESS_SLUG,
        publicPath: `/servicios/${CATEGORY_SLUG}/${BUSINESS_SLUG}`,
        tenantId: TEST_TENANT_ID,
        uid: userRecord.uid,
        membershipId: membership.id,
        membershipName: membership.name,
        membershipPrice: membership.price,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Smoke E2E: dealer ↔ seller (código/link single-use + desligar).
 * Usa Firebase Admin (ADC) + APIs de producción con ID tokens.
 */

import admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';
const API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDlPCtTMCZy4WXvhhyPOI9fac0LjN1jo44';

const DEALER_ORIGIN =
  process.env.SMOKE_DEALER_URL ||
  'https://dealer-app--autodealers-7f62e.us-central1.hosted.app';
const SELLER_ORIGIN =
  process.env.SMOKE_SELLER_URL ||
  'https://seller-app--autodealers-7f62e.us-central1.hosted.app';

const RUN_ID = Date.now().toString(36);
const DEALER_EMAIL = `smoke-dealer-${RUN_ID}@autodealers.test`;
const SELLER_EMAIL = `smoke-seller-${RUN_ID}@autodealers.test`;
const PASSWORD = `Smoke!${RUN_ID}`;

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
const auth = admin.auth();

const state = {
  dealerUid: null,
  sellerUid: null,
  dealerTenantId: null,
  sellerTenantId: null,
  inviteCode: null,
  linkId: null,
};

function log(step, ok, detail = '') {
  const mark = ok ? 'OK  ' : 'FAIL';
  console.log(`${mark} ${step}${detail ? ` — ${detail}` : ''}`);
  if (!ok) throw new Error(detail || step);
}

async function idTokenForEmailPassword(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.idToken) {
    throw new Error(data.error?.message || 'No se pudo iniciar sesión');
  }
  return data.idToken;
}

async function api(method, origin, path, token, body) {
  const res = await fetch(`${origin}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function setupUsers() {
  const dealerTenantRef = db.collection('tenants').doc();
  const sellerTenantRef = db.collection('tenants').doc();
  state.dealerTenantId = dealerTenantRef.id;
  state.sellerTenantId = sellerTenantRef.id;

  const dealerUser = await auth.createUser({
    email: DEALER_EMAIL,
    password: PASSWORD,
    displayName: `Smoke Dealer ${RUN_ID}`,
  });
  const sellerUser = await auth.createUser({
    email: SELLER_EMAIL,
    password: PASSWORD,
    displayName: `Smoke Seller ${RUN_ID}`,
  });
  state.dealerUid = dealerUser.uid;
  state.sellerUid = sellerUser.uid;

  const now = admin.firestore.FieldValue.serverTimestamp();

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
    email: DEALER_EMAIL,
    name: `Smoke Dealer ${RUN_ID}`,
    role: 'dealer',
    tenantId: state.dealerTenantId,
    membershipId: '',
    membershipType: 'dealer',
    status: 'active',
    settings: {},
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('users').doc(sellerUser.uid).set({
    email: SELLER_EMAIL,
    name: `Smoke Seller ${RUN_ID}`,
    role: 'seller',
    tenantId: state.sellerTenantId,
    membershipId: '',
    membershipType: 'seller',
    status: 'active',
    settings: {},
    createdAt: now,
    updatedAt: now,
  });

  await auth.setCustomUserClaims(dealerUser.uid, {
    role: 'dealer',
    tenantId: state.dealerTenantId,
  });
  await auth.setCustomUserClaims(sellerUser.uid, {
    role: 'seller',
    tenantId: state.sellerTenantId,
  });

  // Membresía activa mínima para permitir createSeller
  const membershipRef = db.collection('memberships').doc();
  await membershipRef.set({
    name: 'Smoke Dealer Plan',
    type: 'dealer',
    status: 'active',
    price: 0,
    features: {
      maxSellers: 10,
      adminAssignOnly: false,
    },
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('subscriptions').doc(`smoke-${RUN_ID}`).set({
    tenantId: state.dealerTenantId,
    membershipId: membershipRef.id,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('tenants').doc(state.dealerTenantId).update({
    membershipId: membershipRef.id,
    subscriptionStatus: 'active',
  });
}

async function cleanup() {
  const batchDeletes = [];

  if (state.linkId) {
    batchDeletes.push(db.collection('dealer_seller_links').doc(state.linkId).delete());
  }

  const invites = await db
    .collection('dealer_seller_invites')
    .where('dealerTenantId', '==', state.dealerTenantId)
    .get()
    .catch(() => ({ docs: [] }));
  for (const doc of invites.docs || []) {
    batchDeletes.push(doc.ref.delete());
  }

  if (state.dealerUid) batchDeletes.push(db.collection('users').doc(state.dealerUid).delete());
  if (state.sellerUid) batchDeletes.push(db.collection('users').doc(state.sellerUid).delete());
  if (state.dealerTenantId) batchDeletes.push(db.collection('tenants').doc(state.dealerTenantId).delete());
  if (state.sellerTenantId) batchDeletes.push(db.collection('tenants').doc(state.sellerTenantId).delete());

  await Promise.allSettled(batchDeletes);

  if (state.dealerUid) await auth.deleteUser(state.dealerUid).catch(() => {});
  if (state.sellerUid) await auth.deleteUser(state.sellerUid).catch(() => {});
}

async function main() {
  console.log(`\n=== Smoke E2E dealer-seller (${RUN_ID}) ===\n`);

  try {
    await setupUsers();
    log('setup temp users', true, `${DEALER_EMAIL} / ${SELLER_EMAIL}`);

    const dealerToken = await idTokenForEmailPassword(DEALER_EMAIL, PASSWORD);
    const sellerToken = await idTokenForEmailPassword(SELLER_EMAIL, PASSWORD);
    log('firebase id tokens', true);

    // 1) Dealer crea código de invitación
    const createCode = await api('POST', DEALER_ORIGIN, '/api/dealer-seller-invite-code', dealerToken, {
      message: 'Smoke test invite',
    });
    log(
      'dealer POST invite-code',
      createCode.status === 200 && createCode.json?.inviteCode?.code,
      `status=${createCode.status}`
    );
    state.inviteCode = createCode.json.inviteCode.code;

    // 2) Preview público (sin auth)
    const preview = await fetch(`${SELLER_ORIGIN}/api/join-dealer/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: state.inviteCode }),
    });
    const previewJson = await preview.json();
    log(
      'seller preview invite code',
      preview.ok && previewJson.valid === true,
      previewJson.dealerName || previewJson.error || `status=${preview.status}`
    );

    // 3) Seller acepta con código
    const join = await api('POST', SELLER_ORIGIN, '/api/join-dealer/join', sellerToken, {
      code: state.inviteCode,
    });
    log(
      'seller join with code',
      join.status === 200 && join.json?.success === true,
      join.json?.error || `status=${join.status}`
    );
    state.linkId = join.json?.link?.id;

    // 4) Verificar link aceptado en Firestore
    const linkSnap = state.linkId
      ? await db.collection('dealer_seller_links').doc(state.linkId).get()
      : null;
    log(
      'firestore link accepted',
      linkSnap?.exists && linkSnap.data()?.status === 'accepted',
      linkSnap?.data()?.status || 'missing'
    );

    // 5) Código single-use debe quedar inactivo
    const inviteSnap = await db
      .collection('dealer_seller_invites')
      .where('code', '==', state.inviteCode)
      .limit(1)
      .get();
    const inviteStatus = inviteSnap.docs[0]?.data()?.status;
    log('invite code single-use consumed', inviteStatus === 'used', inviteStatus || 'missing');

    // 6) Seller se desliga
    const disconnect = await api(
      'POST',
      SELLER_ORIGIN,
      '/api/dealer-seller-links/disconnect',
      sellerToken
    );
    log(
      'seller disconnect',
      disconnect.status === 200 && disconnect.json?.success === true,
      disconnect.json?.error || `status=${disconnect.status}`
    );

    const linkAfter = state.linkId
      ? await db.collection('dealer_seller_links').doc(state.linkId).get()
      : null;
    log(
      'firestore link after disconnect',
      linkAfter?.data()?.status === 'revoked',
      linkAfter?.data()?.status || 'missing'
    );

    // 7) Membresía Pro no visible en self-service (seller)
    const plans = await api('GET', SELLER_ORIGIN, '/api/membership/available-plans', sellerToken);
    const planList = Array.isArray(plans.json?.memberships)
      ? plans.json.memberships
      : Array.isArray(plans.json)
        ? plans.json
        : [];
    const hasPro = planList.some((m) =>
      /\bprofessional\b/i.test(String(m?.name || '')) || m?.features?.adminAssignOnly === true
    );
    log(
      'seller plans hide admin-only Pro',
      plans.status === 200 && !hasPro,
      hasPro ? 'Pro visible (bad)' : `${planList.length} plans`
    );

    // 8) join-dealer page renders (HTTP)
    const joinPage = await fetch(`${SELLER_ORIGIN}/join-dealer?code=${state.inviteCode}`);
    log('join-dealer page loads', joinPage.status === 200, `status=${joinPage.status}`);

    console.log('\n=== Smoke E2E PASSED ===\n');
  } finally {
    await cleanup();
    log('cleanup temp data', true);
  }
}

main().catch((err) => {
  console.error('\n=== Smoke E2E FAILED ===');
  console.error(err.message || err);
  process.exit(1);
});

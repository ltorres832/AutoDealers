#!/usr/bin/env node
/**
 * Smoke E2E (core + Firestore): flujo dealer-seller sin HTTP auth.
 * Ejecutar: npx tsx scripts/smoke-dealer-seller-core.ts [runId]
 */

import admin from 'firebase-admin';

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';

const RUN_ID = process.argv[2] || 'mpvk19s1';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

const db = admin.firestore();

function log(step: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${step}${detail ? ` — ${detail}` : ''}`);
  if (!ok) throw new Error(detail || step);
}

async function loadRun() {
  const dealerSnap = await db
    .collection('users')
    .where('email', '==', `smoke-dealer-${RUN_ID}@autodealers.test`)
    .limit(1)
    .get();
  const sellerSnap = await db
    .collection('users')
    .where('email', '==', `smoke-seller-${RUN_ID}@autodealers.test`)
    .limit(1)
    .get();

  if (dealerSnap.empty || sellerSnap.empty) {
    throw new Error(
      `Usuarios smoke no encontrados para runId=${RUN_ID}. Ejecuta smoke-dealer-seller-setup.mjs primero.`
    );
  }

  const dealer = dealerSnap.docs[0].data();
  return {
    dealerTenantId: String(dealer.tenantId),
    dealerUserId: dealerSnap.docs[0].id,
    sellerUserId: sellerSnap.docs[0].id,
  };
}

async function main() {
  const {
    createOrRotateDealerSellerInviteCode,
    previewDealerSellerInviteCode,
    joinDealerWithInviteCode,
  } = await import('../packages/core/src/dealer-seller-invite-codes.ts');
  const { disconnectSellerFromDealer } = await import('../packages/core/src/dealer-seller-links.ts');

  console.log(`\n=== Smoke core dealer-seller (${RUN_ID}) ===\n`);
  const ctx = await loadRun();

  const invite = await createOrRotateDealerSellerInviteCode({
    dealerTenantId: ctx.dealerTenantId,
    dealerUserId: ctx.dealerUserId,
    message: 'Smoke core test',
  });
  log('create invite code', Boolean(invite.code), invite.code);

  const preview = await previewDealerSellerInviteCode(invite.code);
  log('preview invite code', preview.valid === true, preview.dealerName || preview.error);

  const link = await joinDealerWithInviteCode(invite.code, ctx.sellerUserId);
  log('join with code', link.status === 'accepted', `${link.id} / ${link.status}`);

  const inviteAfter = await db
    .collection('dealer_seller_invites')
    .where('code', '==', invite.code)
    .limit(1)
    .get();
  log(
    'invite consumed (single-use)',
    inviteAfter.docs[0]?.data()?.status === 'used',
    String(inviteAfter.docs[0]?.data()?.status)
  );

  const disconnected = await disconnectSellerFromDealer(ctx.sellerUserId);
  log(
    'seller disconnect',
    disconnected?.status === 'revoked',
    disconnected?.status || 'null'
  );

  const sellerAfter = await db.collection('users').doc(ctx.sellerUserId).get();
  log(
    'seller independent again',
    !sellerAfter.data()?.dealerId,
    sellerAfter.data()?.dealerId ? `dealerId=${sellerAfter.data()?.dealerId}` : 'no dealerId'
  );

  console.log('\n=== Smoke core PASSED ===\n');
}

main().catch((err) => {
  console.error('\n=== Smoke core FAILED ===');
  console.error(err?.message || err);
  process.exit(1);
});

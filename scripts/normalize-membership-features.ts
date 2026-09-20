#!/usr/bin/env npx tsx
/** Limpia features huérfanas en Firestore. Ejecutar: npx tsx scripts/normalize-membership-features.ts */

import admin from 'firebase-admin';
import { applyMembershipFeatureDependencyGates } from '../packages/billing/src/membership-display.ts';

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

const db = admin.firestore();

async function main() {
  const snap = await db.collection('memberships').get();
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const raw = (data.features as Record<string, unknown> | undefined) || {};
    const cleaned = applyMembershipFeatureDependencyGates(raw);
    if (JSON.stringify(raw) === JSON.stringify(cleaned)) continue;

    await doc.ref.update({
      features: cleaned,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncVersion: admin.firestore.FieldValue.increment(1),
    });
    updated += 1;
    console.log(`✓ ${doc.id} (${data.name})`);
  }

  console.log(`\nListo: ${updated} membresía(s) actualizada(s) de ${snap.size}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

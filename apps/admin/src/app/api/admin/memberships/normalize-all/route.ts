export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';
import { prepareAdminMembershipFeaturesForSave } from '@/lib/membership-features-admin';
import * as admin from 'firebase-admin';

const db = getFirestore() as admin.firestore.Firestore;

/**
 * Reescribe features{} de todas las membresías del catálogo usando solo valores explícitos.
 * Elimina nulls heredados que inflaban las tarjetas con textos "ilimitado".
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snap = await db.collection('memberships').get();
    let updated = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const raw = (data.features as Record<string, unknown> | undefined) || {};
      const cleaned = prepareAdminMembershipFeaturesForSave(raw);
      await doc.ref.update({
        features: cleaned,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        syncVersion: admin.firestore.FieldValue.increment(1),
      });
      updated += 1;
    }

    return NextResponse.json({
      ok: true,
      updated,
      message: `Features normalizadas en ${updated} membresía(s).`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[memberships/normalize-all]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

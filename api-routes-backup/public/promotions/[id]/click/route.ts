import { NextRequest, NextResponse } from 'next/server';

export async function generateStaticParams() {
  return [];
}
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promotionId = params.id;

    // Buscar la promoción en todos los tenants
    const promotionsSnapshot = await db
      .collectionGroup('promotions')
      .where(admin.firestore.FieldPath.documentId(), '==', promotionId)
      .limit(1)
      .get();

    if (promotionsSnapshot.empty) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    const promotionDoc = promotionsSnapshot.docs[0];
    const promotionRef = promotionDoc.ref;

    // Incrementar contador de clics
    await promotionRef.update({
      clicks: admin.firestore.FieldValue.increment(1),
      lastClickAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error incrementing promotion clicks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



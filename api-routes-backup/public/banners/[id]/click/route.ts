import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function generateStaticParams() {
  return [];
}

// @ts-ignore - carga dinámica para evitar error de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getFirestore } = require('@autodealers/core') as any;

const db = getFirestore();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bannerId = params.id;

    // Buscar el banner en todos los tenants
    const bannersSnapshot = await db
      .collectionGroup('premium_banners')
      .where(admin.firestore.FieldPath.documentId(), '==', bannerId)
      .limit(1)
      .get();

    if (bannersSnapshot.empty) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const bannerDoc = bannersSnapshot.docs[0];
    const bannerRef = bannerDoc.ref;

    // Incrementar contador de clics
    await bannerRef.update({
      clicks: admin.firestore.FieldValue.increment(1),
      lastClickAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error incrementing banner clicks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



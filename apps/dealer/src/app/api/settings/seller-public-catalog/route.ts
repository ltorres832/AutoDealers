import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthIncludingSeller } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Catálogo público del vendedor (video). Solo el propio usuario con rol seller.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthIncludingSeller(request);
    if (!auth?.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(auth.userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const tenantId = auth.tenantId || userData.tenantId;
    let tenantSubdomain = '';
    if (tenantId) {
      const t = await db.collection('tenants').doc(tenantId).get();
      tenantSubdomain = (t.data()?.subdomain as string) || '';
    }

    return NextResponse.json({
      publicPromoVideoUrl: typeof userData.publicPromoVideoUrl === 'string' ? userData.publicPromoVideoUrl : '',
      sellerId: auth.userId,
      tenantSubdomain,
    });
  } catch (error: unknown) {
    console.error('seller-public-catalog GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuthIncludingSeller(request);
    if (!auth?.userId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const raw = body.publicPromoVideoUrl;
    const publicPromoVideoUrl = typeof raw === 'string' ? raw.trim() : '';

    await getFirestore()
      .collection('users')
      .doc(auth.userId)
      .update({
        publicPromoVideoUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true, publicPromoVideoUrl });
  } catch (error: unknown) {
    console.error('seller-public-catalog PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

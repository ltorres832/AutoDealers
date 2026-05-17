import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Video promocional del vendedor (publicPromoVideoUrl en users/{uid}).
 * Visible en public-web /seller/[id] antes del inventario.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
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
      const t = await db.collection('tenants').doc(tenantId as string).get();
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
    const auth = await verifyAuth(request);
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

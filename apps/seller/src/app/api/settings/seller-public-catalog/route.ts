import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import {
  normalizePromoVideoUrls,
  resolvePromoVideoUrlsFromBody,
  sellerPromoVideoFields,
} from '@autodealers/shared/promo-video-urls';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Videos promocionales del vendedor (publicPromoVideoUrls en users/{uid}).
 * Visible en public-web /seller/[id] antes del inventario (grilla 2 columnas).
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
    const urls = normalizePromoVideoUrls(
      userData.publicPromoVideoUrls,
      userData.publicPromoVideoUrl
    );
    const tenantId = auth.tenantId || userData.tenantId;
    let tenantSubdomain = '';
    if (tenantId) {
      const t = await db.collection('tenants').doc(tenantId as string).get();
      tenantSubdomain = (t.data()?.subdomain as string) || '';
    }

    return NextResponse.json({
      publicPromoVideoUrls: urls,
      publicPromoVideoUrl: urls[0] || '',
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
    const urls = resolvePromoVideoUrlsFromBody(body as Record<string, unknown>);
    const fields = sellerPromoVideoFields(urls);

    await getFirestore()
      .collection('users')
      .doc(auth.userId)
      .update({
        ...fields,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      publicPromoVideoUrls: urls,
      publicPromoVideoUrl: fields.publicPromoVideoUrl,
    });
  } catch (error: unknown) {
    console.error('seller-public-catalog PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

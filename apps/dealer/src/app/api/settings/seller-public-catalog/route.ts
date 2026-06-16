import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthIncludingSeller } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import {
  normalizePromoVideoUrls,
  resolvePromoVideoUrlsFromBody,
  sellerPromoVideoFields,
} from '@autodealers/shared/promo-video-urls';
import {
  normalizePublicTrustGalleryPhotos,
  resolveTrustGalleryFromBody,
} from '@autodealers/shared/public-trust-gallery';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

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
    const urls = normalizePromoVideoUrls(
      userData.publicPromoVideoUrls,
      userData.publicPromoVideoUrl
    );

    return NextResponse.json({
      publicPromoVideoUrls: urls,
      publicPromoVideoUrl: urls[0] || '',
      publicTrustGalleryPhotos: normalizePublicTrustGalleryPhotos(
        userData.publicTrustGalleryPhotos
      ),
      sellerId: auth.userId,
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
    const urls = resolvePromoVideoUrlsFromBody(body as Record<string, unknown>);
    const fields = sellerPromoVideoFields(urls);
    const galleryPhotos = resolveTrustGalleryFromBody(body as Record<string, unknown>);

    await getFirestore()
      .collection('users')
      .doc(auth.userId)
      .update({
        ...fields,
        publicTrustGalleryPhotos: galleryPhotos,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      publicPromoVideoUrls: urls,
      publicPromoVideoUrl: fields.publicPromoVideoUrl,
      publicTrustGalleryPhotos: galleryPhotos,
    });
  } catch (error: unknown) {
    console.error('seller-public-catalog PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

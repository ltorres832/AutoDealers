import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import {
  normalizePublicTrustGalleryPhotos,
  resolveTrustGalleryFromBody,
} from '@autodealers/shared/public-trust-gallery';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc = await getFirestore().collection('users').doc(auth.userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    return NextResponse.json({
      publicTrustGalleryPhotos: normalizePublicTrustGalleryPhotos(
        userData.publicTrustGalleryPhotos
      ),
    });
  } catch (error: unknown) {
    console.error('public-trust-gallery GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const galleryPhotos = resolveTrustGalleryFromBody(body as Record<string, unknown>);

    await getFirestore()
      .collection('users')
      .doc(auth.userId)
      .update({
        publicTrustGalleryPhotos: galleryPhotos,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true, publicTrustGalleryPhotos: galleryPhotos });
  } catch (error: unknown) {
    console.error('public-trust-gallery PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

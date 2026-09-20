import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthIncludingSeller } from '@/lib/auth';
import { getStorage, getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthIncludingSeller(request);
    if (!auth || !auth.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    // Dealer full photo: allow up to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const storage = getStorage();
    const filename = `dealer_photo_${auth.userId}_${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
    const fileRef = storage.bucket().file(`tenants/${auth.tenantId}/profile/${filename}`);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });
    await fileRef.makePublic();

    const photoUrl = `https://storage.googleapis.com/${storage.bucket().name}/${fileRef.name}`;
    const db = getFirestore();

    await db.collection('users').doc(auth.userId).update({
      photo: photoUrl,
      profilePhoto: photoUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Also store on tenant for public dealer branding
    if (auth.role !== 'seller') {
      await db.collection('tenants').doc(auth.tenantId).set(
        {
          photo: photoUrl,
          profilePhoto: photoUrl,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({ photoUrl });
  } catch (error: unknown) {
    console.error('Error uploading dealer photo:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuthIncludingSeller(request);
    if (!auth || !auth.userId || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storage = getStorage();
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: `tenants/${auth.tenantId}/profile/` });
    await Promise.all(files.map((file) => file.delete().catch(() => undefined)));

    const db = getFirestore();
    await db.collection('users').doc(auth.userId).update({
      photo: admin.firestore.FieldValue.delete(),
      profilePhoto: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (auth.role !== 'seller') {
      await db.collection('tenants').doc(auth.tenantId).set(
        {
          photo: admin.firestore.FieldValue.delete(),
          profilePhoto: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting dealer photo:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

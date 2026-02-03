import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getStorage } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir a Firebase Storage
    const storage = getStorage();
    const filename = `avatar_${auth.userId}_${Date.now()}.${file.name.split('.').pop()}`;
    const fileRef = storage.bucket().file(`users/${auth.userId}/avatar/${filename}`);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Hacer el archivo público
    await fileRef.makePublic();

    // Obtener URL pública
    const photoUrl = `https://storage.googleapis.com/${storage.bucket().name}/${fileRef.name}`;

    // Actualizar foto en el documento del usuario
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    await db.collection('users').doc(auth.userId).update({
      photo: photoUrl,
      profilePhoto: photoUrl, // Compatibilidad
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ photoUrl });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Eliminar foto del Storage
    const storage = getStorage();
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: `users/${auth.userId}/avatar/` });
    
    await Promise.all(files.map((file) => file.delete()));

    // Eliminar referencia en Firestore
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    await db.collection('users').doc(auth.userId).update({
      photo: admin.firestore.FieldValue.delete(),
      profilePhoto: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



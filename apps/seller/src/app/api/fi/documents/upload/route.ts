export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getStorage } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();
const storage = getStorage();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clientId = formData.get('clientId') as string;
    const requestId = formData.get('requestId') as string | null;
    const type = formData.get('type') as string;

    if (!file || !clientId) {
      return NextResponse.json({ error: 'File and clientId are required' }, { status: 400 });
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and PDF are allowed.' },
        { status: 400 }
      );
    }

    // Validar tamaño (máx 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convertir a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar nombre único
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `fi_documents/${auth.tenantId}/${clientId}/${type}_${timestamp}_${sanitizedName}`;

    // Subir a Firebase Storage
    const bucket = storage.bucket();
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          clientId,
          requestId: requestId || '',
          uploadedBy: auth.userId,
          documentType: type,
        },
      },
    });

    // Hacer el archivo público o generar URL firmada
    await fileRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Generar thumbnail si es imagen
    let thumbnailUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      // Para imágenes, usar la misma URL como thumbnail (en producción, generar thumbnail)
      thumbnailUrl = publicUrl;
    }

    // Guardar referencia en Firestore
    const documentRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('fi_clients')
      .doc(clientId)
      .collection('documents')
      .doc();

    const documentData = {
      id: documentRef.id,
      clientId,
      requestId: requestId || null,
      type,
      name: file.name,
      url: publicUrl,
      thumbnailUrl,
      size: file.size,
      contentType: file.type,
      uploadedBy: auth.userId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await documentRef.set(documentData);

    return NextResponse.json({
      documentId: documentRef.id,
      url: publicUrl,
      thumbnail: thumbnailUrl,
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir documento' },
      { status: 500 }
    );
  }
}



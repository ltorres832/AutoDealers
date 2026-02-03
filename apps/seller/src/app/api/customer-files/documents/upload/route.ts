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
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const customerFileId = formData.get('customerFileId') as string;

    if (!file || !name || !customerFileId) {
      return NextResponse.json(
        { error: 'File, name, and customerFileId are required' },
        { status: 400 }
      );
    }

    // Validar tamaño (máx 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande. Máximo 10MB' },
        { status: 400 }
      );
    }

    // Convertir a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determinar extensión y tipo MIME
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const contentType = mimeTypes[extension] || 'application/octet-stream';

    // Generar nombre único
    const timestamp = Date.now();
    const sanitizedName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `customer-files/${auth.tenantId}/${customerFileId}/${timestamp}_${sanitizedName}.${extension}`;

    // Subir a Firebase Storage
    const bucket = storage.bucket();
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          uploadedBy: auth.userId,
          tenantId: auth.tenantId,
          customerFileId,
          documentName: name,
          documentType: type,
        },
      },
    });

    // Hacer el archivo público o generar URL firmada
    await fileRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Generar URL de descarga firmada (válida por 1 año)
    const [downloadUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Muy lejano en el futuro
    });

    // Actualizar customer file en Firestore
    const customerFileRef = db
      .collection('tenants')
      .doc(auth.tenantId!)
      .collection('customer-files')
      .doc(customerFileId);

    const customerFileDoc = await customerFileRef.get();
    if (!customerFileDoc.exists) {
      return NextResponse.json({ error: 'Customer file not found' }, { status: 404 });
    }

    const documents = customerFileDoc.data()?.documents || [];
    const newDocument = {
      id: `doc_${Date.now()}`,
      name,
      type,
      url: publicUrl,
      downloadUrl,
      uploadedBy: auth.role || 'seller',
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      size: file.size,
      mimeType: contentType,
      fileName: file.name,
    };

    await customerFileRef.update({
      documents: admin.firestore.FieldValue.arrayUnion(newDocument),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      document: {
        ...newDocument,
        uploadedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir documento' },
      { status: 500 }
    );
  }
}



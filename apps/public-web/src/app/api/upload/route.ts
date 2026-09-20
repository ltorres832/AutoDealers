import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@autodealers/core';
import { randomBytes, randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function guessContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const documentType = String(formData.get('documentType') || 'document');
    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    const contentType = guessContentType(file);
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: 'Solo se permiten PDF e imágenes (jpg, png, webp).' },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 10 MB.' },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const bucket = storage.bucket();
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const safeDocType = documentType.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const safeName = (file.name || 'document').replace(/[^a-zA-Z0-9.-]/g, '_').slice(-80);
    const rnd = randomBytes(6).toString('hex');
    const path = `fi-document-uploads/${yyyy}/${mm}/${Date.now()}-${rnd}-${safeDocType}-${safeName}`;
    const downloadToken = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());

    await bucket.file(path).save(buffer, {
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          source: 'public-fi-document-upload',
          documentType: safeDocType,
          uploadedAt: now.toISOString(),
        },
      },
    });

    const encodedPath = encodeURIComponent(path);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ url, path, contentType });
  } catch (error: unknown) {
    console.error('Error en POST /api/upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al subir documento' },
      { status: 500 }
    );
  }
}

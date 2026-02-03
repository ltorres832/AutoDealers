import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getStorage } from '@autodealers/core';
import * as admin from 'firebase-admin';

const storage = getStorage();
const bucket = storage.bucket();

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const kind = (formData.get('kind') as string) || 'image';

    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (kind === 'image' && !isImage) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }
    if (kind === 'video' && !isVideo) {
      return NextResponse.json({ error: 'El archivo debe ser un video' }, { status: 400 });
    }

    const maxSize = kind === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > maxSize * 1024 * 1024) {
      return NextResponse.json(
        { error: `El archivo supera el límite de ${maxSize}MB` },
        { status: 400 }
      );
    }

    const fileName = `advertisers/${auth.userId}/ads/${Date.now()}_${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    await fileRef.makePublic();
    const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir archivo' },
      { status: 500 }
    );
  }
}



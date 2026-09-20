import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { optimizeAdImageForPlacement } from '@/lib/ad-image-optimize';
import type { AdPlacement } from '@/lib/ad-placement-preview';
import { getStorage } from '@autodealers/core';
import { parseAdPlacement } from '@autodealers/core/ad-placements';

const MAX_IMAGE_MB = 20;
const MAX_VIDEO_MB = 50;

function parsePlacement(raw: string | null): AdPlacement {
  return parseAdPlacement(raw, 'between_content');
}

export async function POST(request: NextRequest) {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();

    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const kind = (formData.get('kind') as string) || 'image';
    const placement = parsePlacement(formData.get('placement') as string | null);

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
    if (kind === 'video' && !['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
      return NextResponse.json({ error: 'Formato de video no permitido. Usa MP4 o WebM.' }, { status: 400 });
    }

    const maxSize = kind === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > maxSize * 1024 * 1024) {
      return NextResponse.json(
        { error: `El archivo supera el límite de ${maxSize}MB` },
        { status: 400 }
      );
    }

    let buffer = Buffer.from(await file.arrayBuffer());
    let contentType = file.type || 'application/octet-stream';
    let fileExt = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';

    let optimizedMeta: { width?: number; height?: number; optimized?: boolean } = {};

    if (kind === 'image') {
      try {
        const result = await optimizeAdImageForPlacement(buffer, placement);
        buffer = result.buffer;
        contentType = result.contentType;
        fileExt = result.extension;
        optimizedMeta = {
          width: result.width,
          height: result.height,
          optimized: true,
        };
      } catch (optimizeErr) {
        console.warn('ad upload optimize fallback:', optimizeErr);
        optimizedMeta = { optimized: false };
      }
    }

    const safeBase = (file.name || 'media').replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80);
    const fileName = `advertisers/${auth.userId}/ads/${Date.now()}_${safeBase.replace(/\.[^.]+$/, '')}${fileExt || ''}`;
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      resumable: false,
    });

    await fileRef.makePublic();
    const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return NextResponse.json({
      success: true,
      url,
      ...optimizedMeta,
      placement,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al subir archivo';
    console.error('Upload error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

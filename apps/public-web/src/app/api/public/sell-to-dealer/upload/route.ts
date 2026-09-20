export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@autodealers/core';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif)$/i;
const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 91;

function isImage(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  return IMAGE_EXT.test(file.name);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }
    const file = formData.get('file') as File | null;
    const tenantId = String(formData.get('tenantId') || '').trim();
    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }
    if (!isImage(file)) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes (jpg, png, webp).' },
        { status: 400 }
      );
    }
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen es demasiado grande (máx 12 MB).' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    let outputBuffer: Buffer;
    let storageContentType = 'image/jpeg';
    try {
      const meta = await sharp(inputBuffer).metadata();
      const pipeline = sharp(inputBuffer).rotate().resize({
        width: MAX_EDGE_PX,
        height: MAX_EDGE_PX,
        fit: 'inside',
        withoutEnlargement: true,
      });
      if (meta.format === 'png' && meta.hasAlpha) {
        outputBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
        storageContentType = 'image/png';
      } else if (meta.format === 'webp') {
        outputBuffer = await pipeline.webp({ quality: 88, effort: 4 }).toBuffer();
        storageContentType = 'image/webp';
      } else {
        outputBuffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
        storageContentType = 'image/jpeg';
      }
    } catch {
      outputBuffer = inputBuffer;
      storageContentType = file.type || 'image/jpeg';
    }

    const storage = getStorage();
    const bucket = storage.bucket();
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ext =
      storageContentType === 'image/png'
        ? '.png'
        : storageContentType === 'image/webp'
          ? '.webp'
          : '.jpg';
    const rnd = randomBytes(6).toString('hex');
    const folder = tenantId ? tenantId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : 'public';
    const path = `sell-to-dealer/${folder}/${yyyy}/${mm}/${Date.now()}-${rnd}${ext}`;

    const gcsFile = bucket.file(path);
    await gcsFile.save(outputBuffer, {
      metadata: { contentType: storageContentType, cacheControl: 'public, max-age=31536000' },
      resumable: false,
    });
    try {
      await gcsFile.makePublic();
    } catch {
      /* bucket may already be public */
    }

    const url = `https://storage.googleapis.com/${bucket.name}/${path}`;
    return NextResponse.json({ url, path });
  } catch (error: unknown) {
    console.error('sell-to-dealer upload:', error);
    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
  }
}

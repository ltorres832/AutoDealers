export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@autodealers/core';
import { randomBytes, randomUUID } from 'node:crypto';
import sharp from 'sharp';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif)$/i;

/** Borde máximo en px: se reduce solo si la foto es más grande (sin ampliar pequeñas). Calidad alta para web. */
const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 91;

function isImage(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  return IMAGE_EXT.test(file.name);
}

function guessContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.avif')) return 'image/avif';
  return 'application/octet-stream';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }
    if (!isImage(file)) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes (jpg, png, webp).' },
        { status: 400 }
      );
    }
    const max = 12 * 1024 * 1024;
    if (file.size > max) {
      return NextResponse.json(
        { error: 'La imagen es demasiado grande (máx 12 MB antes de optimizar).' },
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
      const fmt = meta.format;
      if (fmt === 'png' && meta.hasAlpha) {
        outputBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
        storageContentType = 'image/png';
      } else if (fmt === 'webp') {
        outputBuffer = await pipeline.webp({ quality: 88, effort: 4 }).toBuffer();
        storageContentType = 'image/webp';
      } else {
        outputBuffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
        storageContentType = 'image/jpeg';
      }
    } catch (sharpErr) {
      console.warn('quick-listings upload sharp fallback:', sharpErr);
      outputBuffer = inputBuffer;
      storageContentType = guessContentType(file);
    }

    const storage = getStorage();
    const bucket = storage.bucket();

    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const base = (file.name || 'photo').replace(/[^a-zA-Z0-9.-]/g, '_').slice(-50);
    const ext =
      storageContentType === 'image/png'
        ? '.png'
        : storageContentType === 'image/webp'
          ? '.webp'
          : '.jpg';
    const safe = base.replace(/\.[^.]+$/, '') + ext;
    const rnd = randomBytes(6).toString('hex');
    const path = `quick-listings/${yyyy}/${mm}/${Date.now()}-${rnd}-${safe}`;
    const fileRef = bucket.file(path);
    const downloadToken = randomUUID();

    await fileRef.save(outputBuffer, {
      metadata: {
        contentType: storageContentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          source: 'public-quick-listing',
          uploadedAt: now.toISOString(),
        },
      },
    });

    const encodedPath = encodeURIComponent(path);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;
    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('quick-listings upload:', e);
    return NextResponse.json(
      { error: 'Error al subir la imagen' },
      { status: 500 }
    );
  }
}

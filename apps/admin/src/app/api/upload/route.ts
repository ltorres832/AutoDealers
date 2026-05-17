export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAuth } from '@/lib/auth';
import { uploadVehicleImage } from '@autodealers/inventory';
import { getStorage } from '@autodealers/core';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v)$/i;

function guessContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  return 'application/octet-stream';
}

function isProbablyImage(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXT.test(file.name);
}

function isProbablyVideo(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  return VIDEO_EXT.test(file.name);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Para admin, no requiere tenantId
    // Para dealer/seller, sí lo requiere
    if (auth.role !== 'admin' && !auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validar tipo de archivo (algunos .ico llegan con type vacío en Windows)
    const isImage = isProbablyImage(file);
    const isVideo = isProbablyVideo(file);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen o un video' },
        { status: 400 }
      );
    }

    const contentType = guessContentType(file);

    // Validar tamaño (máximo 100MB para videos, 10MB para imágenes)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `El archivo es demasiado grande. Máximo: ${isVideo ? '100MB' : '10MB'}` },
        { status: 400 }
      );
    }

    let url: string;

    if (type === 'vehicle') {
      if (!auth.tenantId) {
        return NextResponse.json({ error: 'Tenant ID required for vehicle upload' }, { status: 400 });
      }
      const vehicleId = formData.get('vehicleId') as string || 'temp';
      url = await uploadVehicleImage(
        auth.tenantId,
        vehicleId,
        buffer,
        file.name,
        contentType
      );
    } else if (
      type === 'campaign' ||
      type === 'promotion' ||
      type === 'review' ||
      type === 'general' ||
      type === 'branding'
    ) {
      if (type === 'branding' && auth.role !== 'admin') {
        return NextResponse.json({ error: 'Solo administradores pueden subir branding' }, { status: 403 });
      }
      // Para campaigns, promotions, reviews, archivos generales y marca del panel admin
      const storage = getStorage();
      const bucket = storage.bucket();
      
      const folder = isVideo ? 'videos' : 'images';
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      // Usar tenantId si está disponible, sino usar 'admin' o 'global'
      const tenantId = auth.tenantId || 'admin';
      const folderPrefix = type === 'branding' ? 'admin/branding' : `tenants/${tenantId}/${type}s`;
      const filePath = `${folderPrefix}/${timestamp}_${sanitizedFilename}`;
      const fileRef = bucket.file(filePath);
      // URL con token: compatible con buckets con "uniform bucket-level access" (makePublic() falla ahí).
      const downloadToken = randomUUID();

      await fileRef.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
            tenantId: tenantId,
            type: type,
            uploadedBy: auth.userId,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      const encodedPath = encodeURIComponent(filePath);
      url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;
    } else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}





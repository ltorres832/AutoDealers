import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { uploadFile } from '@autodealers/core';
import { BUSINESS_SERVICE_PHOTO, BUSINESS_SERVICE_VIDEO } from '@/lib/business-media-specs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Selecciona un archivo' }, { status: 400 });
  }

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: 'Solo se permiten fotos o videos' }, { status: 400 });
  }
  const maxBytes = isVideo ? BUSINESS_SERVICE_VIDEO.maxBytes : BUSINESS_SERVICE_PHOTO.maxBytes;
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: isVideo
          ? `El video no puede superar ${BUSINESS_SERVICE_VIDEO.maxMb} MB`
          : `La imagen no puede superar ${BUSINESS_SERVICE_PHOTO.maxMb} MB`,
      },
      { status: 400 }
    );
  }

  const folder = String(formData.get('folder') || 'services').replace(/[^a-z0-9_-]/gi, '') || 'services';
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
  const url = await uploadFile(auth.tenantId, buffer, `media.${ext}`, file.type, folder);
  return NextResponse.json({ url, kind: isVideo ? 'video' : 'image' });
}

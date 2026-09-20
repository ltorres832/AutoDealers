import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { uploadFile, updateAutomotiveBusiness, getAutomotiveBusinessById } from '@autodealers/core';
import { BUSINESS_PROFILE_PHOTO } from '@/lib/business-media-specs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBusiness(request);
    if (!auth?.tenantId) {
      return jsonError('No autorizado', 401);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(
        `No se pudo leer la imagen. Prueba con un archivo más pequeño (máx. ${BUSINESS_PROFILE_PHOTO.maxMb} MB).`,
        400
      );
    }

    const file = formData.get('photo');
    if (!(file instanceof File) || file.size < 1) {
      return jsonError('Selecciona una imagen', 400);
    }
    const type = file.type || '';
    if (type && !type.startsWith('image/')) {
      return jsonError('El archivo debe ser una imagen', 400);
    }
    if (file.size > BUSINESS_PROFILE_PHOTO.maxBytes) {
      return jsonError(`La imagen no puede superar ${BUSINESS_PROFILE_PHOTO.maxMb} MB`, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    const logoUrl = await uploadFile(
      auth.tenantId,
      buffer,
      `perfil.${ext}`,
      type || 'image/jpeg',
      'branding'
    );
    await updateAutomotiveBusiness(auth.tenantId, { logoUrl });
    const business = await getAutomotiveBusinessById(auth.tenantId);
    return NextResponse.json({
      logoUrl: business?.logoUrl || logoUrl,
      business: business
        ? { id: business.id, name: business.name, logoUrl: business.logoUrl || logoUrl }
        : { logoUrl },
    });
  } catch (error) {
    console.error('[business profile photo]', error);
    const message = error instanceof Error ? error.message : 'No se pudo subir la imagen';
    return jsonError(message, 500);
  }
}

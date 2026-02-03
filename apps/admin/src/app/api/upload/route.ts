export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { uploadVehicleImage } from '@autodealers/inventory';
import { getStorage } from '@autodealers/core';

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

    // Validar tipo de archivo
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen o un video' },
        { status: 400 }
      );
    }

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
        file.type
      );
    } else if (type === 'campaign' || type === 'promotion' || type === 'review' || type === 'general') {
      // Para campaigns, promotions, reviews y archivos generales
      const storage = getStorage();
      const bucket = storage.bucket();
      
      const folder = isVideo ? 'videos' : 'images';
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      // Usar tenantId si está disponible, sino usar 'admin' o 'global'
      const tenantId = auth.tenantId || 'admin';
      const filePath = `tenants/${tenantId}/${type}s/${timestamp}_${sanitizedFilename}`;
      const fileRef = bucket.file(filePath);

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            tenantId: tenantId,
            type: type,
            uploadedBy: auth.userId,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      await fileRef.makePublic();
      url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
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





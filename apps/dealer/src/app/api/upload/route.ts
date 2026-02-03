import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { uploadVehicleImage } from '@autodealers/inventory';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const folder = formData.get('folder') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let url: string;

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

    if (type === 'vehicle') {
      const vehicleId = formData.get('vehicleId') as string || 'temp';
      url = await uploadVehicleImage(
        auth.tenantId,
        vehicleId,
        buffer,
        file.name,
        file.type
      );
    } else {
      // Para campañas, promociones, anuncios, etc., usar una función genérica de upload
      const { getStorage } = await import('@autodealers/core');
      const storage = getStorage();
      const bucket = storage.bucket();
      
      const uploadFolder = folder || (isVideo ? 'videos' : 'images');
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `tenants/${auth.tenantId}/${uploadFolder}/${timestamp}_${sanitizedFilename}`;
      const fileRef = bucket.file(filePath);

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            tenantId: auth.tenantId,
            type: type || uploadFolder,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      await fileRef.makePublic();
      url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




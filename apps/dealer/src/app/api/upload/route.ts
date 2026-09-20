import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthIncludingSeller } from '@/lib/auth';
import { isSellerRole } from '@/lib/dealer-portal-roles';
import { uploadVehicleImage } from '@autodealers/inventory';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthIncludingSeller(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    let folder = formData.get('folder') as string;

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

    if (isSellerRole(auth.role)) {
      const isTrustGalleryUpload = type === 'seller_public_trust_gallery' && isImage;
      const isWebsiteHeroImage = type === 'website_hero_image' && isImage;
      if (!isVideo && !isTrustGalleryUpload && !isWebsiteHeroImage) {
        return NextResponse.json(
          { error: 'Los vendedores pueden subir videos o fotos para su página pública' },
          { status: 403 }
        );
      }
      if (type === 'vehicle') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      folder = `seller-public/${auth.userId}`;
    }

    // Validar tamaño (máximo 100MB para videos, 10MB para imágenes)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `El archivo es demasiado grande. Máximo: ${isVideo ? '100MB' : '10MB'}` },
        { status: 400 }
      );
    }

    if (isVideo && !['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato de video no permitido. Usa MP4 o WebM.' },
        { status: 400 }
      );
    }

    if (isVideo && type === 'vehicle') {
      const { canExecuteFeature } = await import('@autodealers/core');
      const check = await canExecuteFeature(auth.tenantId, 'uploadVideo');
      if (!check.allowed) {
        return NextResponse.json(
          {
            error: check.reason || 'La subida de videos no está incluida en tu plan',
            reason: check.reason || 'Activa o selecciona una membresía que incluya videos de vehículos.',
            upgradeRequired: true,
          },
          { status: 403 }
        );
      }
    }

    if (type === 'dealer_website_promo') {
      if (isSellerRole(auth.role)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      if (!isVideo) {
        return NextResponse.json({ error: 'Solo se permiten archivos de video' }, { status: 400 });
      }
      const { getStorage } = await import('@autodealers/core');
      const { uploadBufferToAccessibleUrl } = await import('@autodealers/shared/firebase-storage-upload');
      const storage = getStorage();
      const bucket = storage.bucket();
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `tenants/${auth.tenantId}/website-promo/${timestamp}_${sanitizedFilename}`;
      url = await uploadBufferToAccessibleUrl(bucket, filePath, buffer, file.type, {
        tenantId: auth.tenantId,
        type: 'dealer_website_promo',
      });
    } else if (type === 'website_hero_image' || type === 'website_hero_video') {
      const wantVideo = type === 'website_hero_video';
      if (wantVideo && !isVideo) {
        return NextResponse.json({ error: 'Solo se permiten archivos de video' }, { status: 400 });
      }
      if (!wantVideo && !isImage) {
        return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
      }
      const { getStorage } = await import('@autodealers/core');
      const { uploadBufferToAccessibleUrl } = await import('@autodealers/shared/firebase-storage-upload');
      const storage = getStorage();
      const bucket = storage.bucket();
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `tenants/${auth.tenantId}/website-hero/${auth.userId}/${timestamp}_${sanitizedFilename}`;
      url = await uploadBufferToAccessibleUrl(bucket, filePath, buffer, file.type, {
        tenantId: auth.tenantId,
        userId: auth.userId,
        type,
      });
    } else if (type === 'seller_public_trust_gallery' && isImage) {
      const { getStorage } = await import('@autodealers/core');
      const { uploadBufferToAccessibleUrl } = await import('@autodealers/shared/firebase-storage-upload');
      const storage = getStorage();
      const bucket = storage.bucket();
      const userId = auth.userId;
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `tenants/${auth.tenantId}/public-trust-gallery/${userId}/${timestamp}_${sanitizedFilename}`;
      url = await uploadBufferToAccessibleUrl(bucket, filePath, buffer, file.type, {
        tenantId: auth.tenantId,
        userId,
        type: 'seller_public_trust_gallery',
      });
    } else if (type === 'seller_public_promo' && isVideo) {
      const { getStorage } = await import('@autodealers/core');
      const { uploadBufferToAccessibleUrl } = await import('@autodealers/shared/firebase-storage-upload');
      const storage = getStorage();
      const bucket = storage.bucket();
      const userId = auth.userId;
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `tenants/${auth.tenantId}/seller-public/${userId}/${timestamp}_${sanitizedFilename}`;
      url = await uploadBufferToAccessibleUrl(bucket, filePath, buffer, file.type, {
        tenantId: auth.tenantId,
        userId,
        type: 'seller_public_promo',
      });
    } else if (type === 'vehicle') {
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




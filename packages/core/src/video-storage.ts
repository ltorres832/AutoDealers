// Gestión de almacenamiento de videos

import * as admin from 'firebase-admin';

function getStorage(): admin.storage.Storage {
  if (!admin.apps.length) {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  return admin.storage();
}

const storage = getStorage();

/**
 * Sube un video
 */
export async function uploadVideo(
  tenantId: string,
  file: Buffer,
  filename: string,
  contentType: string = 'video/mp4',
  folder: 'campaigns' | 'promotions' | 'messages' = 'campaigns'
): Promise<string> {
  const bucket = storage.bucket();
  const filePath = `tenants/${tenantId}/${folder}/${Date.now()}-${filename}`;
  const fileRef = bucket.file(filePath);

  await fileRef.save(file, {
    metadata: {
      contentType,
      metadata: {
        tenantId,
        uploadedAt: new Date().toISOString(),
      },
    },
  });

  // Hacer el archivo público
  await fileRef.makePublic();

  // Obtener URL pública
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

  return publicUrl;
}

/**
 * Valida tipo de video
 */
export function validateVideoType(contentType: string): boolean {
  const allowedTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ];
  return allowedTypes.includes(contentType);
}

/**
 * Valida tamaño de video
 */
export function validateVideoSize(size: number, maxSizeMB: number = 100): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}


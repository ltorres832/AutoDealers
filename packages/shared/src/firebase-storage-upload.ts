import { randomUUID } from 'node:crypto';
import type { Bucket } from '@google-cloud/storage';

/** URL pública vía token de descarga de Firebase (compatible con uniform bucket-level access). */
export function buildFirebaseStorageMediaUrl(
  bucketName: string,
  filePath: string,
  downloadToken: string
): string {
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}

/**
 * Guarda un archivo y devuelve una URL accesible.
 * Intenta makePublic(); si falla (bucket uniforme), usa token de descarga Firebase.
 */
export async function uploadBufferToAccessibleUrl(
  bucket: Bucket,
  filePath: string,
  buffer: Buffer,
  contentType: string,
  metadata: Record<string, string> = {}
): Promise<string> {
  const fileRef = bucket.file(filePath);
  const downloadToken = randomUUID();

  await fileRef.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
    },
  });

  try {
    await fileRef.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  } catch {
    return buildFirebaseStorageMediaUrl(bucket.name, filePath, downloadToken);
  }
}

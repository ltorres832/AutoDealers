// Gestión de almacenamiento de archivos

import { getStorage } from './firebase';
import * as admin from 'firebase-admin';

const storage = getStorage();

/**
 * Sube un archivo a Firebase Storage
 */
export async function uploadFile(
  tenantId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'general'
): Promise<string> {
  const bucket = storage.bucket();
  const filePath = `tenants/${tenantId}/${folder}/${Date.now()}-${fileName}`;
  const file = bucket.file(filePath);

  await file.save(fileBuffer, {
    metadata: {
      contentType: contentType,
    },
  });

  // Hacer el archivo público
  await file.makePublic();

  return file.publicUrl();
}

/**
 * Elimina un archivo de Firebase Storage
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // Extraer el path del URL
    const url = new URL(fileUrl);
    const path = decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0] || '');
    
    if (!path) {
      throw new Error('Invalid file URL');
    }

    const bucket = storage.bucket();
    const file = bucket.file(path);
    await file.delete();
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}






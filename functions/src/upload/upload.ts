// Cloud Functions para Upload de archivos a Firebase Storage

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const storage = getStorage();
const db = getFirestore();

/**
 * Upload de archivo genérico
 */
export const uploadFile = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { file, type, tenantId, vehicleId, filename, contentType } = request.data;

      if (!file || !type) {
        throw new HttpsError('invalid-argument', 'File and type are required');
      }

      // Verificar autenticación
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Validar tipo de archivo
      const isImage = contentType?.startsWith('image/');
      const isVideo = contentType?.startsWith('video/');
      
      if (!isImage && !isVideo) {
        throw new HttpsError('invalid-argument', 'File must be an image or video');
      }

      // Convertir base64 a buffer si es necesario
      let buffer: Buffer;
      if (typeof file === 'string') {
        // Base64
        buffer = Buffer.from(file, 'base64');
      } else if (file instanceof Buffer) {
        buffer = file;
      } else {
        throw new HttpsError('invalid-argument', 'Invalid file format');
      }

      // Validar tamaño (máximo 100MB para videos, 10MB para imágenes)
      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (buffer.length > maxSize) {
        throw new HttpsError(
          'invalid-argument',
          `File is too large. Maximum: ${isVideo ? '100MB' : '10MB'}`
        );
      }

      const bucket = storage.bucket();
      let filePath: string;
      let downloadUrl: string;

      if (type === 'vehicle') {
        if (!tenantId || !vehicleId) {
          throw new HttpsError('invalid-argument', 'Tenant ID and Vehicle ID are required for vehicle upload');
        }

        filePath = `tenants/${tenantId}/vehicles/${vehicleId}/${filename || `photo_${Date.now()}.jpg`}`;
        
        const file = bucket.file(filePath);
        await file.save(buffer, {
          metadata: {
            contentType: contentType || 'image/jpeg',
          },
        });

        // Hacer el archivo público
        await file.makePublic();
        downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      } else if (type === 'campaign' || type === 'promotion' || type === 'review' || type === 'general') {
        if (!tenantId) {
          throw new HttpsError('invalid-argument', 'Tenant ID is required');
        }

        const folder = type === 'campaign' ? 'campaigns' : 
                      type === 'promotion' ? 'promotions' : 
                      type === 'review' ? 'reviews' : 'general';
        
        filePath = `tenants/${tenantId}/${folder}/${filename || `file_${Date.now()}.${isImage ? 'jpg' : 'mp4'}`}`;
        
        const file = bucket.file(filePath);
        await file.save(buffer, {
          metadata: {
            contentType: contentType || (isImage ? 'image/jpeg' : 'video/mp4'),
          },
        });

        // Hacer el archivo público
        await file.makePublic();
        downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      } else if (type === 'avatar') {
        const userId = request.auth.uid;
        filePath = `users/${userId}/avatar/${filename || `avatar_${Date.now()}.jpg`}`;
        
        const file = bucket.file(filePath);
        await file.save(buffer, {
          metadata: {
            contentType: contentType || 'image/jpeg',
          },
        });

        await file.makePublic();
        downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        // Actualizar avatar del usuario
        await db.collection('users').doc(userId).update({
          avatar: downloadUrl,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (type === 'document') {
        if (!tenantId) {
          throw new HttpsError('invalid-argument', 'Tenant ID is required');
        }

        filePath = `tenants/${tenantId}/documents/${filename || `doc_${Date.now()}.pdf`}`;
        
        const file = bucket.file(filePath);
        await file.save(buffer, {
          metadata: {
            contentType: contentType || 'application/pdf',
          },
        });

        // Los documentos no son públicos por defecto
        downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      } else if (type === 'branding') {
        if (!tenantId) {
          throw new HttpsError('invalid-argument', 'Tenant ID is required');
        }

        filePath = `tenants/${tenantId}/branding/${filename || `branding_${Date.now()}.jpg`}`;
        
        const file = bucket.file(filePath);
        await file.save(buffer, {
          metadata: {
            contentType: contentType || 'image/jpeg',
          },
        });

        await file.makePublic();
        downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      } else {
        throw new HttpsError('invalid-argument', `Invalid upload type: ${type}`);
      }

      return {
        success: true,
        url: downloadUrl,
        path: filePath,
        size: buffer.length,
        contentType: contentType || 'image/jpeg',
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Upload failed: ${error.message}`);
    }
  }
);

/**
 * Eliminar archivo
 */
export const deleteFile = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { filePath } = request.data;

      if (!filePath) {
        throw new HttpsError('invalid-argument', 'File path is required');
      }

      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const bucket = storage.bucket();
      const file = bucket.file(filePath);

      // Verificar que el archivo existe
      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError('not-found', 'File not found');
      }

      // Eliminar archivo
      await file.delete();

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error: any) {
      console.error('Delete file error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Delete failed: ${error.message}`);
    }
  }
);



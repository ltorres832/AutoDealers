import { getStorage } from '@autodealers/shared';

// Lazy initialization
function getStorageInstance() {
  try {
    const storage = getStorage();
    if (!storage) {
      throw new Error('Storage no está disponible.');
    }
    return storage;
  } catch (error: any) {
    console.error('❌ Error obteniendo storage:', error.message);
    throw error;
  }
}

/**
 * Sube una imagen o video de vehículo
 */
export async function uploadVehicleImage(
  tenantId: string,
  vehicleId: string,
  file: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  console.log('🚀 uploadVehicleImage iniciado:', {
    tenantId,
    vehicleId,
    filename,
    contentType,
    fileSize: file.length,
    storageAvailable: true,
  });

  // Obtener el bucket - intentar múltiples formatos de nombre
  let bucket;
  const possibleBucketNames = [
    'autodealers-7f62e.firebasestorage.app', // Formato nuevo
    'autodealers-7f62e.appspot.com', // Formato antiguo
    'autodealers-7f62e', // Solo project ID
  ];

  try {
    const storageInstance = getStorageInstance();

    // Intentar obtener el bucket con diferentes nombres
    let bucketError: any = null;
    for (const bucketName of possibleBucketNames) {
      try {
        bucket = storageInstance.bucket(bucketName);
        // Verificar que el bucket tenga nombre (esto confirma que existe)
        if (bucket && bucket.name) {
          console.log('📦 Bucket obtenido exitosamente:', {
            bucketName: bucket.name,
            triedName: bucketName,
            match: bucket.name === bucketName || bucket.name.includes('autodealers-7f62e'),
          });
          break; // Éxito, salir del loop
        }
      } catch (err: any) {
        bucketError = err;
        console.log(`⚠️ No se pudo obtener bucket con nombre '${bucketName}':`, err.message);
        continue; // Intentar siguiente nombre
      }
    }

    // Si todos los nombres fallaron, intentar bucket por defecto
    if (!bucket || !bucket.name) {
      console.warn('⚠️ No se pudo obtener bucket con nombres específicos, intentando bucket por defecto...');
      try {
        bucket = storageInstance.bucket(); // Sin parámetros usa el bucket configurado en Firebase
        if (bucket && bucket.name) {
          console.log('📦 Bucket obtenido por defecto:', bucket.name);
        } else {
          throw new Error('Bucket por defecto no tiene nombre');
        }
      } catch (defaultError: any) {
        console.error('❌ Error obteniendo bucket por defecto:', defaultError.message);
        throw new Error(
          `No se pudo obtener el bucket de Storage. ` +
          `Intentados: ${possibleBucketNames.join(', ')}. ` +
          `Error: ${bucketError?.message || defaultError.message}. ` +
          `Verifica que Firebase Storage esté habilitado en tu proyecto Firebase Console.`
        );
      }
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo bucket:', {
      error: error.message,
      errorCode: error.code,
      errorStack: error.stack,
      storageAvailable: !!getStorageInstance(),
    });
    throw error;
  }

  // Determinar si es video o imagen basado en el contentType
  const isVideo = contentType.startsWith('video/');
  const folder = isVideo ? 'videos' : 'images';

  // Sanitizar el nombre del archivo para evitar problemas con caracteres especiales
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\s+/g, '_');

  // Agregar timestamp para evitar colisiones
  const timestamp = Date.now();
  const finalFilename = `${timestamp}_${sanitizedFilename}`;

  const filePath = `tenants/${tenantId}/vehicles/${vehicleId}/${folder}/${finalFilename}`;
  const fileRef = bucket.file(filePath);

  console.log('📤 Subiendo archivo:', {
    tenantId,
    vehicleId,
    filename: finalFilename,
    contentType,
    filePath,
    bucketName: bucket.name,
    fileSize: file.length,
  });

  try {
    // Guardar el archivo
    await fileRef.save(file, {
      metadata: {
        contentType,
        metadata: {
          tenantId,
          vehicleId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    console.log('✅ Archivo guardado en Storage');

    // Hacer el archivo público
    await fileRef.makePublic();
    console.log('✅ Archivo hecho público');

    // Obtener URL pública - usar getSignedUrl con expiración larga o URL pública directa
    let publicUrl: string;

    // Como el archivo ya es público, usar URL directa (más simple y confiable)
    // La URL directa funciona mejor para archivos públicos que getSignedUrl
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
    publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodedPath}`;

    console.log('🔗 URL pública generada:', {
      filePath,
      encodedPath,
      publicUrl,
      bucketName: bucket.name,
    });

    console.log('✅ Archivo subido exitosamente:', {
      filePath,
      publicUrl,
      bucketName: bucket.name,
    });

    return publicUrl;
  } catch (error: any) {
    console.error('❌ Error subiendo archivo a Storage:', {
      error: error.message,
      code: error.code,
      bucketName: bucket.name,
      filePath,
    });
    throw new Error(`Error al subir archivo: ${error.message}`);
  }
}

/**
 * Elimina una imagen de vehículo
 */
export async function deleteVehicleImage(
  tenantId: string,
  vehicleId: string,
  filename: string
): Promise<void> {
  const bucket = getStorageInstance().bucket();
  const filePath = `tenants/${tenantId}/vehicles/${vehicleId}/${filename}`;
  const fileRef = bucket.file(filePath);

  await fileRef.delete();
}

/**
 * Sube logo de tenant
 */
export async function uploadTenantLogo(
  tenantId: string,
  file: Buffer,
  filename: string,
  contentType: string = 'image/png'
): Promise<string> {
  const bucket = getStorageInstance().bucket();
  const filePath = `tenants/${tenantId}/branding/logo/${filename}`;
  const fileRef = bucket.file(filePath);

  await fileRef.save(file, {
    metadata: {
      contentType,
    },
  });

  await fileRef.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

  return publicUrl;
}

/**
 * Sube favicon de tenant
 */
export async function uploadTenantFavicon(
  tenantId: string,
  file: Buffer,
  filename: string,
  contentType: string = 'image/x-icon'
): Promise<string> {
  const bucket = getStorageInstance().bucket();
  const filePath = `tenants/${tenantId}/branding/favicon/${filename}`;
  const fileRef = bucket.file(filePath);

  await fileRef.save(file, {
    metadata: {
      contentType,
    },
  });

  await fileRef.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

  return publicUrl;
}

/**
 * Valida tipo de archivo de imagen
 */
export function validateImageType(contentType: string): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return allowedTypes.includes(contentType);
}

/**
 * Valida tamaño de archivo
 */
export function validateFileSize(size: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}




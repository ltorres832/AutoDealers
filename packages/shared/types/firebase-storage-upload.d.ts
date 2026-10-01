import type { Bucket } from '@google-cloud/storage';
/** URL pública vía token de descarga de Firebase (compatible con uniform bucket-level access). */
export declare function buildFirebaseStorageMediaUrl(bucketName: string, filePath: string, downloadToken: string): string;
/**
 * Guarda un archivo y devuelve una URL accesible.
 * Intenta makePublic(); si falla (bucket uniforme), usa token de descarga Firebase.
 */
export declare function uploadBufferToAccessibleUrl(bucket: Bucket, filePath: string, buffer: Buffer, contentType: string, metadata?: Record<string, string>): Promise<string>;

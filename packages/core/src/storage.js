"use strict";
// Gestión de almacenamiento de archivos
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
const shared_1 = require("@autodealers/shared");
const storage = (0, shared_1.getStorage)();
/**
 * Sube un archivo a Firebase Storage
 */
async function uploadFile(tenantId, fileBuffer, fileName, contentType, folder = 'general') {
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
async function deleteFile(fileUrl) {
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
    }
    catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
}

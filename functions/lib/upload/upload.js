"use strict";
// Cloud Functions para Upload de archivos a Firebase Storage
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.uploadFile = void 0;
const https_1 = require("firebase-functions/v2/https");
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const storage = (0, storage_1.getStorage)();
const db = (0, firestore_1.getFirestore)();
/**
 * Upload de archivo genérico
 */
exports.uploadFile = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { file, type, tenantId, vehicleId, filename, contentType } = request.data;
        if (!file || !type) {
            throw new https_1.HttpsError('invalid-argument', 'File and type are required');
        }
        // Verificar autenticación
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Validar tipo de archivo
        const isImage = contentType === null || contentType === void 0 ? void 0 : contentType.startsWith('image/');
        const isVideo = contentType === null || contentType === void 0 ? void 0 : contentType.startsWith('video/');
        if (!isImage && !isVideo) {
            throw new https_1.HttpsError('invalid-argument', 'File must be an image or video');
        }
        // Convertir base64 a buffer si es necesario
        let buffer;
        if (typeof file === 'string') {
            // Base64
            buffer = Buffer.from(file, 'base64');
        }
        else if (file instanceof Buffer) {
            buffer = file;
        }
        else {
            throw new https_1.HttpsError('invalid-argument', 'Invalid file format');
        }
        // Validar tamaño (máximo 100MB para videos, 10MB para imágenes)
        const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (buffer.length > maxSize) {
            throw new https_1.HttpsError('invalid-argument', `File is too large. Maximum: ${isVideo ? '100MB' : '10MB'}`);
        }
        const bucket = storage.bucket();
        let filePath;
        let downloadUrl;
        if (type === 'vehicle') {
            if (!tenantId || !vehicleId) {
                throw new https_1.HttpsError('invalid-argument', 'Tenant ID and Vehicle ID are required for vehicle upload');
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
        }
        else if (type === 'campaign' || type === 'promotion' || type === 'review' || type === 'general') {
            if (!tenantId) {
                throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
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
        }
        else if (type === 'avatar') {
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
        }
        else if (type === 'document') {
            if (!tenantId) {
                throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
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
        }
        else if (type === 'branding') {
            if (!tenantId) {
                throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
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
        }
        else {
            throw new https_1.HttpsError('invalid-argument', `Invalid upload type: ${type}`);
        }
        return {
            success: true,
            url: downloadUrl,
            path: filePath,
            size: buffer.length,
            contentType: contentType || 'image/jpeg',
        };
    }
    catch (error) {
        console.error('Upload error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Upload failed: ${error.message}`);
    }
});
/**
 * Eliminar archivo
 */
exports.deleteFile = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { filePath } = request.data;
        if (!filePath) {
            throw new https_1.HttpsError('invalid-argument', 'File path is required');
        }
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const bucket = storage.bucket();
        const file = bucket.file(filePath);
        // Verificar que el archivo existe
        const [exists] = await file.exists();
        if (!exists) {
            throw new https_1.HttpsError('not-found', 'File not found');
        }
        // Eliminar archivo
        await file.delete();
        return {
            success: true,
            message: 'File deleted successfully',
        };
    }
    catch (error) {
        console.error('Delete file error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Delete failed: ${error.message}`);
    }
});
//# sourceMappingURL=upload.js.map
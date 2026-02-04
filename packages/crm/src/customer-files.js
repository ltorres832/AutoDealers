"use strict";
// Gestión de Customer Files (Casos de Cliente)
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
exports.createCustomerFile = createCustomerFile;
exports.getCustomerFileById = getCustomerFileById;
exports.getCustomerFileByToken = getCustomerFileByToken;
exports.getCustomerFiles = getCustomerFiles;
exports.requestDocument = requestDocument;
exports.addCustomerDocument = addCustomerDocument;
exports.addDealerDocument = addDealerDocument;
exports.addEvidence = addEvidence;
exports.updateCustomerFileStatus = updateCustomerFileStatus;
exports.deleteCustomerFile = deleteCustomerFile;
exports.updateCustomerFileNotes = updateCustomerFileNotes;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
// Función para generar IDs aleatorios
function generateRandomId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
const db = (0, core_1.getFirestore)();
/**
 * Genera un token único para enlace de subida
 */
function generateUploadToken() {
    return generateRandomId() + generateRandomId(); // 64 caracteres
}
/**
 * Crea un nuevo Customer File automáticamente cuando se completa una venta
 */
async function createCustomerFile(tenantId, saleId, customerId, customerInfo, vehicleId, sellerId, sellerInfo) {
    try {
        // Validar parámetros requeridos
        if (!tenantId) {
            throw new Error('tenantId es requerido');
        }
        if (!saleId) {
            throw new Error('saleId es requerido');
        }
        if (!customerId) {
            throw new Error('customerId es requerido');
        }
        if (!customerInfo || !customerInfo.fullName || !customerInfo.phone || !customerInfo.email) {
            throw new Error('customerInfo debe contener fullName, phone y email');
        }
        if (!vehicleId) {
            throw new Error('vehicleId es requerido');
        }
        if (!sellerId) {
            throw new Error('sellerId es requerido');
        }
        const uploadToken = generateUploadToken();
        const fileData = {
            tenantId,
            saleId,
            customerId,
            customerInfo,
            vehicleId,
            sellerId,
            sellerInfo,
            documents: [],
            requestedDocuments: [],
            uploadToken,
            status: 'active',
            notes: '',
            evidence: [],
        };
        console.log('📝 createCustomerFile - Preparando documento:', {
            tenantId,
            saleId,
            customerId,
            vehicleId,
            sellerId,
            customerName: customerInfo.fullName,
        });
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('customer_files')
            .doc();
        console.log('📝 createCustomerFile - Guardando en Firestore, docId:', docRef.id);
        await docRef.set({
            ...fileData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ createCustomerFile - Documento guardado exitosamente:', docRef.id);
        return {
            id: docRef.id,
            ...fileData,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    catch (error) {
        console.error('❌ createCustomerFile - Error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            tenantId,
            saleId,
            customerId,
        });
        throw error;
    }
}
/**
 * Obtiene un Customer File por ID
 */
async function getCustomerFileById(tenantId, fileId) {
    const doc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('customer_files')
        .doc(fileId)
        .get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        documents: (data.documents || []).map((d) => ({
            ...d,
            uploadedAt: d.uploadedAt?.toDate() || new Date(),
        })),
        requestedDocuments: (data.requestedDocuments || []).map((rd) => ({
            ...rd,
            requestedAt: rd.requestedAt?.toDate() || new Date(),
            receivedAt: rd.receivedAt?.toDate(),
        })),
        evidence: (data.evidence || []).map((e) => ({
            ...e,
            createdAt: e.createdAt?.toDate() || new Date(),
        })),
    };
}
/**
 * Obtiene un Customer File por token de subida
 */
async function getCustomerFileByToken(uploadToken) {
    const snapshot = await db
        .collectionGroup('customer_files')
        .where('uploadToken', '==', uploadToken)
        .where('status', '==', 'active')
        .limit(1)
        .get();
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    const tenantId = doc.ref.parent.parent?.id;
    if (!tenantId) {
        return null;
    }
    return {
        id: doc.id,
        ...data,
        tenantId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        documents: (data.documents || []).map((d) => ({
            ...d,
            uploadedAt: d.uploadedAt?.toDate() || new Date(),
        })),
        requestedDocuments: (data.requestedDocuments || []).map((rd) => ({
            ...rd,
            requestedAt: rd.requestedAt?.toDate() || new Date(),
            receivedAt: rd.receivedAt?.toDate(),
        })),
        evidence: (data.evidence || []).map((e) => ({
            ...e,
            createdAt: e.createdAt?.toDate() || new Date(),
        })),
    };
}
/**
 * Obtiene todos los Customer Files de un tenant
 */
async function getCustomerFiles(tenantId, filters) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('customer_files');
    if (filters?.customerId) {
        query = query.where('customerId', '==', filters.customerId);
    }
    if (filters?.sellerId) {
        query = query.where('sellerId', '==', filters.sellerId);
    }
    if (filters?.saleId) {
        query = query.where('saleId', '==', filters.saleId);
    }
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    // Intentar ordenar por createdAt, si falla por falta de índice, obtener sin ordenar
    let snapshot;
    let usedOrderBy = false;
    try {
        snapshot = await query.orderBy('createdAt', 'desc').get();
        usedOrderBy = true;
    }
    catch (orderError) {
        // Si falla por falta de índice compuesto, obtener sin orderBy y ordenar manualmente
        if (orderError.code === 9 || orderError.message?.includes('index')) {
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
                console.warn('⚠️ Índice faltante para customer_files, obteniendo sin orderBy...');
            }
            snapshot = await query.get();
            usedOrderBy = false;
        }
        else {
            throw orderError;
        }
    }
    const files = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            documents: (data.documents || []).map((d) => ({
                ...d,
                uploadedAt: d.uploadedAt?.toDate() || new Date(),
            })),
            requestedDocuments: (data.requestedDocuments || []).map((rd) => ({
                ...rd,
                requestedAt: rd.requestedAt?.toDate() || new Date(),
                receivedAt: rd.receivedAt?.toDate(),
            })),
            evidence: (data.evidence || []).map((e) => ({
                ...e,
                createdAt: e.createdAt?.toDate() || new Date(),
            })),
        };
    });
    // Si no se usó orderBy (por falta de índice), ordenar manualmente
    if (!usedOrderBy) {
        files.sort((a, b) => {
            const dateA = a.createdAt.getTime();
            const dateB = b.createdAt.getTime();
            return dateB - dateA; // Descendente
        });
    }
    // Eliminar duplicados por ID (por si acaso)
    const uniqueFiles = Array.from(new Map(files.map(file => [file.id, file])).values());
    return uniqueFiles;
}
/**
 * Solicita un documento al cliente
 */
async function requestDocument(tenantId, fileId, documentName, documentType, description, required, requestedBy) {
    const fileRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('customer_files')
        .doc(fileId);
    const fileDoc = await fileRef.get();
    if (!fileDoc.exists) {
        throw new Error('Customer file not found');
    }
    const fileData = fileDoc.data();
    const requestedDocuments = fileData.requestedDocuments || [];
    const newRequest = {
        id: generateRandomId(),
        name: documentName,
        description,
        type: documentType,
        required,
        requestedAt: new Date(),
        requestedBy,
        status: 'pending',
    };
    requestedDocuments.push(newRequest);
    await fileRef.update({
        requestedDocuments,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return newRequest;
}
/**
 * Agrega un documento subido por el cliente
 */
async function addCustomerDocument(tenantId, fileId, document) {
    const fileRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('customer_files')
        .doc(fileId);
    const fileDoc = await fileRef.get();
    if (!fileDoc.exists) {
        throw new Error('Customer file not found');
    }
    const fileData = fileDoc.data();
    const documents = fileData.documents || [];
    const newDocument = {
        id: generateRandomId(),
        ...document,
        uploadedAt: new Date(),
    };
    documents.push(newDocument);
    // Actualizar estado de documentos solicitados si corresponde
    const requestedDocuments = fileData.requestedDocuments || [];
    const updatedRequestedDocuments = requestedDocuments.map((rd) => {
        if (rd.status === 'pending' && rd.type === document.type) {
            return {
                ...rd,
                status: 'received',
                receivedAt: new Date(),
                documentId: newDocument.id,
            };
        }
        return rd;
    });
    await fileRef.update({
        documents,
        requestedDocuments: updatedRequestedDocuments,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return newDocument;
}
/**
 * Agrega un documento subido por el vendedor/dealer
 */
async function addDealerDocument(tenantId, fileId, document, uploadedBy) {
    const fileRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('customer_files')
        .doc(fileId);
    const fileDoc = await fileRef.get();
    if (!fileDoc.exists) {
        throw new Error('Customer file not found');
    }
    const fileData = fileDoc.data();
    const documents = fileData.documents || [];
    const newDocument = {
        id: generateRandomId(),
        ...document,
        uploadedBy,
        uploadedAt: new Date(),
    };
    documents.push(newDocument);
    await fileRef.update({
        documents,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return newDocument;
}
/**
 * Agrega una evidencia al file
 */
async function addEvidence(tenantId, fileId, evidence) {
    const fileRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('customer_files')
        .doc(fileId);
    const fileDoc = await fileRef.get();
    if (!fileDoc.exists) {
        throw new Error('Customer file not found');
    }
    const fileData = fileDoc.data();
    const evidenceList = fileData.evidence || [];
    const newEvidence = {
        id: generateRandomId(),
        ...evidence,
        createdAt: new Date(),
    };
    evidenceList.push(newEvidence);
    await fileRef.update({
        evidence: evidenceList,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return newEvidence;
}
/**
 * Actualiza el estado del Customer File
 */
async function updateCustomerFileStatus(tenantId, fileId, status) {
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('customer_files')
        .doc(fileId)
        .update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Elimina un Customer File (soft delete)
 */
async function deleteCustomerFile(tenantId, fileId, deletedBy) {
    await updateCustomerFileStatus(tenantId, fileId, 'deleted');
    // Agregar evidencia de eliminación
    await addEvidence(tenantId, fileId, {
        type: 'other',
        title: 'File eliminado',
        description: `Eliminado por: ${deletedBy}`,
        createdBy: deletedBy,
    });
}
/**
 * Actualiza las notas del Customer File
 */
async function updateCustomerFileNotes(tenantId, fileId, notes) {
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('customer_files')
        .doc(fileId)
        .update({
        notes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=customer-files.js.map
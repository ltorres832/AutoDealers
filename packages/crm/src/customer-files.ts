// Gestión de Customer Files (Casos de Cliente)

import { CustomerFile, CustomerDocument, RequestedDocument, EvidenceItem } from './types';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Función para generar IDs aleatorios
function generateRandomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const db = getFirestore();

/**
 * Genera un token único para enlace de subida
 */
function generateUploadToken(): string {
  return generateRandomId() + generateRandomId(); // 64 caracteres
}

/**
 * Crea un nuevo Customer File automáticamente cuando se completa una venta
 */
export async function createCustomerFile(
  tenantId: string,
  saleId: string,
  customerId: string,
  customerInfo: CustomerFile['customerInfo'],
  vehicleId: string,
  sellerId: string,
  sellerInfo?: CustomerFile['sellerInfo']
): Promise<CustomerFile> {
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
    
    const fileData: Omit<CustomerFile, 'id' | 'createdAt' | 'updatedAt'> = {
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
    } as any);

    console.log('✅ createCustomerFile - Documento guardado exitosamente:', docRef.id);

    return {
      id: docRef.id,
      ...fileData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error: any) {
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
export async function getCustomerFileById(
  tenantId: string,
  fileId: string
): Promise<CustomerFile | null> {
  const doc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('customer_files')
    .doc(fileId)
    .get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    documents: (data.documents || []).map((d: any) => ({
      ...d,
      uploadedAt: d.uploadedAt?.toDate() || new Date(),
    })),
    requestedDocuments: (data.requestedDocuments || []).map((rd: any) => ({
      ...rd,
      requestedAt: rd.requestedAt?.toDate() || new Date(),
      receivedAt: rd.receivedAt?.toDate(),
    })),
    evidence: (data.evidence || []).map((e: any) => ({
      ...e,
      createdAt: e.createdAt?.toDate() || new Date(),
    })),
  } as CustomerFile;
}

/**
 * Obtiene un Customer File por token de subida
 */
export async function getCustomerFileByToken(
  uploadToken: string
): Promise<CustomerFile | null> {
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
    documents: (data.documents || []).map((d: any) => ({
      ...d,
      uploadedAt: d.uploadedAt?.toDate() || new Date(),
    })),
    requestedDocuments: (data.requestedDocuments || []).map((rd: any) => ({
      ...rd,
      requestedAt: rd.requestedAt?.toDate() || new Date(),
      receivedAt: rd.receivedAt?.toDate(),
    })),
    evidence: (data.evidence || []).map((e: any) => ({
      ...e,
      createdAt: e.createdAt?.toDate() || new Date(),
    })),
  } as CustomerFile;
}

/**
 * Obtiene todos los Customer Files de un tenant
 */
export async function getCustomerFiles(
  tenantId: string,
  filters?: {
    customerId?: string;
    sellerId?: string;
    saleId?: string;
    status?: CustomerFile['status'];
  }
): Promise<CustomerFile[]> {
  let query: admin.firestore.Query = db
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
  } catch (orderError: any) {
    // Si falla por falta de índice compuesto, obtener sin orderBy y ordenar manualmente
    if (orderError.code === 9 || orderError.message?.includes('index')) {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.warn('⚠️ Índice faltante para customer_files, obteniendo sin orderBy...');
      }
      snapshot = await query.get();
      usedOrderBy = false;
    } else {
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
      documents: (data.documents || []).map((d: any) => ({
        ...d,
        uploadedAt: d.uploadedAt?.toDate() || new Date(),
      })),
      requestedDocuments: (data.requestedDocuments || []).map((rd: any) => ({
        ...rd,
        requestedAt: rd.requestedAt?.toDate() || new Date(),
        receivedAt: rd.receivedAt?.toDate(),
      })),
      evidence: (data.evidence || []).map((e: any) => ({
        ...e,
        createdAt: e.createdAt?.toDate() || new Date(),
      })),
    } as CustomerFile;
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
  const uniqueFiles = Array.from(
    new Map(files.map(file => [file.id, file])).values()
  );

  return uniqueFiles;
}

/**
 * Solicita un documento al cliente
 */
export async function requestDocument(
  tenantId: string,
  fileId: string,
  documentName: string,
  documentType: string,
  description: string,
  required: boolean,
  requestedBy: string
): Promise<RequestedDocument> {
  const fileRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('customer_files')
    .doc(fileId);

  const fileDoc = await fileRef.get();
  if (!fileDoc.exists) {
    throw new Error('Customer file not found');
  }

  const fileData = fileDoc.data()!;
  const requestedDocuments = fileData.requestedDocuments || [];

  const newRequest: RequestedDocument = {
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
  } as any);

  return newRequest;
}

/**
 * Agrega un documento subido por el cliente
 */
export async function addCustomerDocument(
  tenantId: string,
  fileId: string,
  document: Omit<CustomerDocument, 'id' | 'uploadedAt'>
): Promise<CustomerDocument> {
  const fileRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('customer_files')
    .doc(fileId);

  const fileDoc = await fileRef.get();
  if (!fileDoc.exists) {
    throw new Error('Customer file not found');
  }

  const fileData = fileDoc.data()!;
  const documents = fileData.documents || [];

  const newDocument: CustomerDocument = {
    id: generateRandomId(),
    ...document,
    uploadedAt: new Date(),
  };

  documents.push(newDocument);

  // Actualizar estado de documentos solicitados si corresponde
  const requestedDocuments = fileData.requestedDocuments || [];
  const updatedRequestedDocuments = requestedDocuments.map((rd: any) => {
    if (rd.status === 'pending' && rd.type === document.type) {
      return {
        ...rd,
        status: 'received' as const,
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
  } as any);

  return newDocument;
}

/**
 * Agrega un documento subido por el vendedor/dealer
 */
export async function addDealerDocument(
  tenantId: string,
  fileId: string,
  document: Omit<CustomerDocument, 'id' | 'uploadedAt'>,
  uploadedBy: 'seller' | 'dealer'
): Promise<CustomerDocument> {
  const fileRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('customer_files')
    .doc(fileId);

  const fileDoc = await fileRef.get();
  if (!fileDoc.exists) {
    throw new Error('Customer file not found');
  }

  const fileData = fileDoc.data()!;
  const documents = fileData.documents || [];

  const newDocument: CustomerDocument = {
    id: generateRandomId(),
    ...document,
    uploadedBy,
    uploadedAt: new Date(),
  };

  documents.push(newDocument);

  await fileRef.update({
    documents,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return newDocument;
}

/**
 * Agrega una evidencia al file
 */
export async function addEvidence(
  tenantId: string,
  fileId: string,
  evidence: Omit<EvidenceItem, 'id' | 'createdAt'>
): Promise<EvidenceItem> {
  const fileRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('customer_files')
    .doc(fileId);

  const fileDoc = await fileRef.get();
  if (!fileDoc.exists) {
    throw new Error('Customer file not found');
  }

  const fileData = fileDoc.data()!;
  const evidenceList = fileData.evidence || [];

  const newEvidence: EvidenceItem = {
    id: generateRandomId(),
    ...evidence,
    createdAt: new Date(),
  };

  evidenceList.push(newEvidence);

  await fileRef.update({
    evidence: evidenceList,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return newEvidence;
}

/**
 * Actualiza el estado del Customer File
 */
export async function updateCustomerFileStatus(
  tenantId: string,
  fileId: string,
  status: CustomerFile['status']
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('customer_files')
    .doc(fileId)
    .update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

/**
 * Elimina un Customer File (soft delete)
 */
export async function deleteCustomerFile(
  tenantId: string,
  fileId: string,
  deletedBy: string
): Promise<void> {
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
export async function updateCustomerFileNotes(
  tenantId: string,
  fileId: string,
  notes: string
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('customer_files')
    .doc(fileId)
    .update({
      notes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}


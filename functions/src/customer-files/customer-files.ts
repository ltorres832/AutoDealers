// Cloud Functions para Customer Files
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import {
  createCustomerFile,
  getCustomerFileById,
  getCustomerFileByToken,
  getCustomerFiles,
  requestDocument,
  addCustomerDocument,
  addDealerDocument,
  addEvidence,
  updateCustomerFileStatus,
  deleteCustomerFile,
  updateCustomerFileNotes,
} from '@autodealers/crm';

const db = getFirestore();

// Crear customer file
export const createCustomerFileFunction = onCall(async (request) => {
  const { tenantId, saleId, customerId, customerInfo, vehicleId, sellerId, sellerInfo } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !saleId || !customerId || !customerInfo || !vehicleId || !sellerId) {
    throw new HttpsError('invalid-argument', 'Todos los campos requeridos deben estar presentes');
  }

  try {
    const customerFile = await createCustomerFile(
      tenantId,
      saleId,
      customerId,
      customerInfo,
      vehicleId,
      sellerId,
      sellerInfo
    );

    return { customerFile };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear customer file: ${error.message}`);
  }
});

// Obtener customer file por ID
export const getCustomerFileByIdFunction = onCall(async (request) => {
  const { tenantId, fileId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !fileId) {
    throw new HttpsError('invalid-argument', 'tenantId y fileId son requeridos');
  }

  try {
    const customerFile = await getCustomerFileById(tenantId, fileId);
    if (!customerFile) {
      throw new HttpsError('not-found', 'Customer file no encontrado');
    }
    return { customerFile };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al obtener customer file: ${error.message}`);
  }
});

// Obtener customer file por token
export const getCustomerFileByTokenFunction = onCall(async (request) => {
  const { uploadToken } = request.data;

  if (!uploadToken) {
    throw new HttpsError('invalid-argument', 'uploadToken es requerido');
  }

  try {
    const customerFile = await getCustomerFileByToken(uploadToken);
    if (!customerFile) {
      throw new HttpsError('not-found', 'Customer file no encontrado');
    }
    return { customerFile };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al obtener customer file: ${error.message}`);
  }
});

// Obtener customer files
export const getCustomerFilesFunction = onCall(async (request) => {
  const { tenantId, filters } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    const customerFiles = await getCustomerFiles(tenantId, filters);
    return { customerFiles };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener customer files: ${error.message}`);
  }
});

// Solicitar documento
export const requestDocumentFunction = onCall(async (request) => {
  const { tenantId, fileId, documentName, documentType, description, required, requestedBy } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !fileId || !documentName || !documentType || !requestedBy) {
    throw new HttpsError('invalid-argument', 'Todos los campos requeridos deben estar presentes');
  }

  try {
    const requestedDocument = await requestDocument(
      tenantId,
      fileId,
      documentName,
      documentType,
      description || '',
      required !== false,
      requestedBy
    );
    return { requestedDocument };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al solicitar documento: ${error.message}`);
  }
});

// Agregar documento del cliente
export const addCustomerDocumentFunction = onCall(async (request) => {
  const { tenantId, fileId, document } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !fileId || !document) {
    throw new HttpsError('invalid-argument', 'tenantId, fileId y document son requeridos');
  }

  try {
    const newDocument = await addCustomerDocument(tenantId, fileId, document);
    return { document: newDocument };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al agregar documento: ${error.message}`);
  }
});

// Agregar documento del dealer
export const addDealerDocumentFunction = onCall(async (request) => {
  const { tenantId, fileId, document, uploadedBy } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !fileId || !document || !uploadedBy) {
    throw new HttpsError('invalid-argument', 'Todos los campos requeridos deben estar presentes');
  }

  try {
    const newDocument = await addDealerDocument(tenantId, fileId, document, uploadedBy);
    return { document: newDocument };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al agregar documento del dealer: ${error.message}`);
  }
});

// Agregar evidencia
export const addEvidenceFunction = onCall(async (request) => {
  const { tenantId, fileId, evidence } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !fileId || !evidence) {
    throw new HttpsError('invalid-argument', 'tenantId, fileId y evidence son requeridos');
  }

  try {
    const newEvidence = await addEvidence(tenantId, fileId, evidence);
    return { evidence: newEvidence };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al agregar evidencia: ${error.message}`);
  }
});

// Actualizar estado
export const updateCustomerFileStatusFunction = onCall(async (request) => {
  const { tenantId, fileId, status } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !fileId || !status) {
    throw new HttpsError('invalid-argument', 'tenantId, fileId y status son requeridos');
  }

  try {
    await updateCustomerFileStatus(tenantId, fileId, status);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar estado: ${error.message}`);
  }
});

// Eliminar customer file
export const deleteCustomerFileFunction = onCall(async (request) => {
  const { tenantId, fileId, deletedBy } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !fileId || !deletedBy) {
    throw new HttpsError('invalid-argument', 'tenantId, fileId y deletedBy son requeridos');
  }

  try {
    await deleteCustomerFile(tenantId, fileId, deletedBy);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al eliminar customer file: ${error.message}`);
  }
});

// Actualizar notas
export const updateCustomerFileNotesFunction = onCall(async (request) => {
  const { tenantId, fileId, notes } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !fileId || notes === undefined) {
    throw new HttpsError('invalid-argument', 'tenantId, fileId y notes son requeridos');
  }

  try {
    await updateCustomerFileNotes(tenantId, fileId, notes);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar notas: ${error.message}`);
  }
});



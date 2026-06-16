"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomerFileNotesFunction = exports.deleteCustomerFileFunction = exports.updateCustomerFileStatusFunction = exports.addEvidenceFunction = exports.addDealerDocumentFunction = exports.addCustomerDocumentFunction = exports.requestDocumentFunction = exports.getCustomerFilesFunction = exports.getCustomerFileByTokenFunction = exports.getCustomerFileByIdFunction = exports.createCustomerFileFunction = void 0;
// Cloud Functions para Customer Files
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const crm_1 = require("@autodealers/crm");
const db = (0, firestore_1.getFirestore)();
// Crear customer file
exports.createCustomerFileFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, saleId, customerId, customerInfo, vehicleId, sellerId, sellerInfo } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !saleId || !customerId || !customerInfo || !vehicleId || !sellerId) {
        throw new https_1.HttpsError('invalid-argument', 'Todos los campos requeridos deben estar presentes');
    }
    try {
        const customerFile = await (0, crm_1.createCustomerFile)(tenantId, saleId, customerId, customerInfo, vehicleId, sellerId, sellerInfo);
        return { customerFile };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear customer file: ${error.message}`);
    }
});
// Obtener customer file por ID
exports.getCustomerFileByIdFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, fileId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !fileId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y fileId son requeridos');
    }
    try {
        const customerFile = await (0, crm_1.getCustomerFileById)(tenantId, fileId);
        if (!customerFile) {
            throw new https_1.HttpsError('not-found', 'Customer file no encontrado');
        }
        return { customerFile };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al obtener customer file: ${error.message}`);
    }
});
// Obtener customer file por token
exports.getCustomerFileByTokenFunction = (0, https_1.onCall)(async (request) => {
    const { uploadToken } = request.data;
    if (!uploadToken) {
        throw new https_1.HttpsError('invalid-argument', 'uploadToken es requerido');
    }
    try {
        const customerFile = await (0, crm_1.getCustomerFileByToken)(uploadToken);
        if (!customerFile) {
            throw new https_1.HttpsError('not-found', 'Customer file no encontrado');
        }
        return { customerFile };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al obtener customer file: ${error.message}`);
    }
});
// Obtener customer files
exports.getCustomerFilesFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, filters } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const customerFiles = await (0, crm_1.getCustomerFiles)(tenantId, filters);
        return { customerFiles };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener customer files: ${error.message}`);
    }
});
// Solicitar documento
exports.requestDocumentFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, fileId, documentName, documentType, description, required, requestedBy } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !fileId || !documentName || !documentType || !requestedBy) {
        throw new https_1.HttpsError('invalid-argument', 'Todos los campos requeridos deben estar presentes');
    }
    try {
        const requestedDocument = await (0, crm_1.requestDocument)(tenantId, fileId, documentName, documentType, description || '', required !== false, requestedBy);
        return { requestedDocument };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al solicitar documento: ${error.message}`);
    }
});
// Agregar documento del cliente
exports.addCustomerDocumentFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, fileId, document } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !fileId || !document) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, fileId y document son requeridos');
    }
    try {
        const newDocument = await (0, crm_1.addCustomerDocument)(tenantId, fileId, document);
        return { document: newDocument };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al agregar documento: ${error.message}`);
    }
});
// Agregar documento del dealer
exports.addDealerDocumentFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, fileId, document, uploadedBy } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !fileId || !document || !uploadedBy) {
        throw new https_1.HttpsError('invalid-argument', 'Todos los campos requeridos deben estar presentes');
    }
    try {
        const newDocument = await (0, crm_1.addDealerDocument)(tenantId, fileId, document, uploadedBy);
        return { document: newDocument };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al agregar documento del dealer: ${error.message}`);
    }
});
// Agregar evidencia
exports.addEvidenceFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, fileId, evidence } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !fileId || !evidence) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, fileId y evidence son requeridos');
    }
    try {
        const newEvidence = await (0, crm_1.addEvidence)(tenantId, fileId, evidence);
        return { evidence: newEvidence };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al agregar evidencia: ${error.message}`);
    }
});
// Actualizar estado
exports.updateCustomerFileStatusFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, fileId, status } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !fileId || !status) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, fileId y status son requeridos');
    }
    try {
        await (0, crm_1.updateCustomerFileStatus)(tenantId, fileId, status);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar estado: ${error.message}`);
    }
});
// Eliminar customer file
exports.deleteCustomerFileFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, fileId, deletedBy } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !fileId || !deletedBy) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, fileId y deletedBy son requeridos');
    }
    try {
        await (0, crm_1.deleteCustomerFile)(tenantId, fileId, deletedBy);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al eliminar customer file: ${error.message}`);
    }
});
// Actualizar notas
exports.updateCustomerFileNotesFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, fileId, notes } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !fileId || notes === undefined) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, fileId y notes son requeridos');
    }
    try {
        await (0, crm_1.updateCustomerFileNotes)(tenantId, fileId, notes);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar notas: ${error.message}`);
    }
});
//# sourceMappingURL=customer-files.js.map
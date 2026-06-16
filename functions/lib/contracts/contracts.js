"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digitalizeContract = exports.signContract = exports.sendForSignature = exports.updateContract = exports.getContracts = exports.createContract = void 0;
// Cloud Functions para Contracts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Crear contrato
exports.createContract = (0, https_1.onCall)(async (request) => {
    const { tenantId, contract } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !contract) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y contract son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('contracts')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, contract), { status: 'draft', createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear contrato: ${error.message}`);
    }
});
// Obtener contratos
exports.getContracts = (0, https_1.onCall)(async (request) => {
    const { tenantId, saleId, leadId, status } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        let query = db
            .collection('tenants')
            .doc(tenantId)
            .collection('contracts');
        if (saleId) {
            query = query.where('saleId', '==', saleId);
        }
        if (leadId) {
            query = query.where('leadId', '==', leadId);
        }
        if (status) {
            query = query.where('status', '==', status);
        }
        query = query.orderBy('createdAt', 'desc').limit(100);
        const snapshot = await query.get();
        const contracts = snapshot.docs.map((doc) => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), completedAt: (_c = doc.data().completedAt) === null || _c === void 0 ? void 0 : _c.toDate() }));
        });
        return { contracts };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener contratos: ${error.message}`);
    }
});
// Actualizar contrato
exports.updateContract = (0, https_1.onCall)(async (request) => {
    const { tenantId, contractId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !contractId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, contractId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('contracts')
            .doc(contractId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar contrato: ${error.message}`);
    }
});
// Enviar para firma
exports.sendForSignature = (0, https_1.onCall)(async (request) => {
    const { tenantId, contractId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !contractId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y contractId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('contracts')
            .doc(contractId)
            .update({
            status: 'pending_signature',
            sentForSignatureAt: new Date(),
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al enviar para firma: ${error.message}`);
    }
});
// Firmar contrato
exports.signContract = (0, https_1.onCall)(async (request) => {
    const { tenantId, contractId, signature } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !contractId || !signature) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, contractId y signature son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('contracts')
            .doc(contractId)
            .update({
            status: 'signed',
            signature,
            signedAt: new Date(),
            signedBy: auth.uid,
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al firmar contrato: ${error.message}`);
    }
});
// Digitalizar contrato
exports.digitalizeContract = (0, https_1.onCall)(async (request) => {
    const { tenantId, contractId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !contractId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y contractId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('contracts')
            .doc(contractId)
            .update({
            digitalized: true,
            digitalizedAt: new Date(),
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al digitalizar contrato: ${error.message}`);
    }
});
//# sourceMappingURL=contracts.js.map
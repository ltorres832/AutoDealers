"use strict";
/**
 * Cloud Functions para Email Aliases
 *
 * Funcionalidades:
 * - Obtener aliases de email
 * - Crear/actualizar/eliminar aliases
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmailAlias = exports.updateEmailAlias = exports.createEmailAlias = exports.getEmailAliases = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener aliases de email
 */
exports.getEmailAliases = (0, https_1.onCall)(async (request) => {
    var _a;
    const { dealerId, assignedTo } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    let query = db.collection('email_aliases');
    if (dealerId) {
        query = query.where('dealerId', '==', dealerId);
    }
    if (assignedTo) {
        query = query.where('assignedTo', '==', assignedTo);
    }
    const snapshot = await query.get();
    const aliases = snapshot.docs.map((doc) => {
        var _a, _b, _c, _d;
        const data = doc.data();
        return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.createdAt, updatedAt: ((_d = (_c = data.updatedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.updatedAt });
    });
    return { aliases };
});
/**
 * Crear alias de email
 */
exports.createEmailAlias = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const { alias, dealerId, assignedTo, forwardTo } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !alias || !dealerId) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const aliasRef = db.collection('email_aliases').doc();
    await aliasRef.set({
        alias,
        dealerId,
        assignedTo: assignedTo || null,
        forwardTo: forwardTo || null,
        isActive: true,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const createdDoc = await aliasRef.get();
    const createdData = createdDoc.data();
    return Object.assign(Object.assign({ id: aliasRef.id }, createdData), { createdAt: ((_c = (_b = createdData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || createdData.createdAt, updatedAt: ((_e = (_d = createdData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || createdData.updatedAt });
});
/**
 * Actualizar alias de email
 */
exports.updateEmailAlias = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const { aliasId, updates } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !aliasId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const aliasRef = db.collection('email_aliases').doc(aliasId);
    await aliasRef.update(Object.assign(Object.assign({}, updates), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    const updatedDoc = await aliasRef.get();
    const updatedData = updatedDoc.data();
    return Object.assign(Object.assign({ id: aliasRef.id }, updatedData), { createdAt: ((_c = (_b = updatedData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || updatedData.createdAt, updatedAt: ((_e = (_d = updatedData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || updatedData.updatedAt });
});
/**
 * Eliminar alias de email
 */
exports.deleteEmailAlias = (0, https_1.onCall)(async (request) => {
    var _a;
    const { aliasId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !aliasId) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    await db.collection('email_aliases').doc(aliasId).delete();
    return { success: true };
});
//# sourceMappingURL=email-aliases.js.map
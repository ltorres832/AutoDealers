"use strict";
/**
 * Cloud Functions para Segments y Tags
 *
 * Funcionalidades:
 * - Gestión de segmentos
 * - Gestión de tags
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTag = exports.updateTag = exports.createTag = exports.getTags = exports.deleteSegment = exports.updateSegment = exports.createSegment = exports.getSegments = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// ==================== Segments ====================
/**
 * Obtener segmentos
 */
exports.getSegments = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('segments')
        .get();
    const segments = snapshot.docs.map((doc) => {
        var _a, _b, _c, _d;
        const data = doc.data();
        return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.createdAt, updatedAt: ((_d = (_c = data.updatedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.updatedAt });
    });
    return { segments };
});
/**
 * Crear segmento
 */
exports.createSegment = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const { tenantId, segment } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !segment) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const segmentRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('segments')
        .doc();
    await segmentRef.set(Object.assign(Object.assign({}, segment), { tenantId, createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    const createdDoc = await segmentRef.get();
    const createdData = createdDoc.data();
    return Object.assign(Object.assign({ id: segmentRef.id }, createdData), { createdAt: ((_c = (_b = createdData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || createdData.createdAt, updatedAt: ((_e = (_d = createdData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || createdData.updatedAt });
});
/**
 * Actualizar segmento
 */
exports.updateSegment = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const { tenantId, segmentId, updates } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !segmentId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const segmentRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('segments')
        .doc(segmentId);
    await segmentRef.update(Object.assign(Object.assign({}, updates), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    const updatedDoc = await segmentRef.get();
    const updatedData = updatedDoc.data();
    return Object.assign(Object.assign({ id: segmentRef.id }, updatedData), { createdAt: ((_c = (_b = updatedData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || updatedData.createdAt, updatedAt: ((_e = (_d = updatedData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || updatedData.updatedAt });
});
/**
 * Eliminar segmento
 */
exports.deleteSegment = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, segmentId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !segmentId) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('segments')
        .doc(segmentId)
        .delete();
    return { success: true };
});
// ==================== Tags ====================
/**
 * Obtener tags
 */
exports.getTags = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('tags')
        .get();
    const tags = snapshot.docs.map((doc) => {
        var _a, _b, _c, _d;
        const data = doc.data();
        return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.createdAt, updatedAt: ((_d = (_c = data.updatedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.updatedAt });
    });
    return { tags };
});
/**
 * Crear tag
 */
exports.createTag = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const { tenantId, tag } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !tag) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const tagRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('tags')
        .doc();
    await tagRef.set(Object.assign(Object.assign({}, tag), { tenantId, createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    const createdDoc = await tagRef.get();
    const createdData = createdDoc.data();
    return Object.assign(Object.assign({ id: tagRef.id }, createdData), { createdAt: ((_c = (_b = createdData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || createdData.createdAt, updatedAt: ((_e = (_d = createdData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || createdData.updatedAt });
});
/**
 * Actualizar tag
 */
exports.updateTag = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const { tenantId, tagId, updates } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !tagId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const tagRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('tags')
        .doc(tagId);
    await tagRef.update(Object.assign(Object.assign({}, updates), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    const updatedDoc = await tagRef.get();
    const updatedData = updatedDoc.data();
    return Object.assign(Object.assign({ id: tagRef.id }, updatedData), { createdAt: ((_c = (_b = updatedData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || updatedData.createdAt, updatedAt: ((_e = (_d = updatedData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || updatedData.updatedAt });
});
/**
 * Eliminar tag
 */
exports.deleteTag = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, tagId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !tagId) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('tags')
        .doc(tagId)
        .delete();
    return { success: true };
});
//# sourceMappingURL=segments-tags.js.map
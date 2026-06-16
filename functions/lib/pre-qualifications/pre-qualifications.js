"use strict";
/**
 * Cloud Functions para Pre-Qualifications
 *
 * Funcionalidades:
 * - Obtener pre-cualificaciones
 * - Crear/actualizar pre-cualificaciones
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePreQualification = exports.createPreQualification = exports.getPreQualifications = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener pre-cualificaciones
 */
exports.getPreQualifications = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, status, limit } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pre_qualifications');
    if (status) {
        query = query.where('status', '==', status);
    }
    if (limit) {
        query = query.limit(limit);
    }
    try {
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const preQualifications = snapshot.docs.map((doc) => {
            var _a, _b, _c, _d;
            const data = doc.data();
            return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.createdAt, updatedAt: ((_d = (_c = data.updatedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.updatedAt });
        });
        return { preQualifications };
    }
    catch (error) {
        if (error.code === 'failed-precondition') {
            const snapshot = await query.get();
            const preQualifications = snapshot.docs.map((doc) => {
                var _a, _b, _c, _d;
                const data = doc.data();
                return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.createdAt, updatedAt: ((_d = (_c = data.updatedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.updatedAt });
            });
            preQualifications.sort((a, b) => {
                const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                return bTime - aTime;
            });
            return { preQualifications };
        }
        throw new https_1.HttpsError('internal', `Error al obtener pre-cualificaciones: ${error.message}`);
    }
});
/**
 * Crear pre-cualificación
 */
exports.createPreQualification = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const { tenantId, clientInfo, vehicleInfo, financialInfo, status } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !clientInfo) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const preQualRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pre_qualifications')
        .doc();
    await preQualRef.set({
        tenantId,
        clientInfo,
        vehicleInfo: vehicleInfo || {},
        financialInfo: financialInfo || {},
        status: status || 'pending',
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const createdDoc = await preQualRef.get();
    const createdData = createdDoc.data();
    return Object.assign(Object.assign({ id: preQualRef.id }, createdData), { createdAt: ((_c = (_b = createdData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || createdData.createdAt, updatedAt: ((_e = (_d = createdData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || createdData.updatedAt });
});
/**
 * Actualizar pre-cualificación
 */
exports.updatePreQualification = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const { tenantId, preQualificationId, updates } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !preQualificationId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const preQualRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pre_qualifications')
        .doc(preQualificationId);
    await preQualRef.update(Object.assign(Object.assign({}, updates), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    const updatedDoc = await preQualRef.get();
    const updatedData = updatedDoc.data();
    return Object.assign(Object.assign({ id: preQualRef.id }, updatedData), { createdAt: ((_c = (_b = updatedData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || updatedData.createdAt, updatedAt: ((_e = (_d = updatedData.updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || updatedData.updatedAt });
});
//# sourceMappingURL=pre-qualifications.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPromotionToLeadsFunction = exports.deletePromotion = exports.pausePromotion = exports.activatePromotion = exports.updatePromotion = exports.getPromotionsFunction = exports.getActivePromotionsFunction = exports.createPromotionFunction = void 0;
// Cloud Functions para Promotions
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const core_1 = require("@autodealers/core");
const db = (0, firestore_1.getFirestore)();
// Crear promoción
exports.createPromotionFunction = (0, https_1.onCall)(async (request) => {
    const { promotion } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!promotion) {
        throw new https_1.HttpsError('invalid-argument', 'promotion es requerido');
    }
    try {
        const newPromotion = await (0, core_1.createPromotion)(promotion);
        return { promotion: newPromotion };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear promoción: ${error.message}`);
    }
});
// Obtener promociones activas
exports.getActivePromotionsFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const promotions = await (0, core_1.getActivePromotions)(tenantId);
        return { promotions };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener promociones activas: ${error.message}`);
    }
});
// Obtener promociones
exports.getPromotionsFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, filters } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId es requerido');
    }
    try {
        const promotions = await (0, core_1.getPromotions)(tenantId, filters);
        return { promotions };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener promociones: ${error.message}`);
    }
});
// Actualizar promoción
exports.updatePromotion = (0, https_1.onCall)(async (request) => {
    const { tenantId, promotionId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !promotionId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, promotionId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('promotions')
            .doc(promotionId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar promoción: ${error.message}`);
    }
});
// Activar promoción
exports.activatePromotion = (0, https_1.onCall)(async (request) => {
    const { tenantId, promotionId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !promotionId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y promotionId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('promotions')
            .doc(promotionId)
            .update({
            status: 'active',
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al activar promoción: ${error.message}`);
    }
});
// Pausar promoción
exports.pausePromotion = (0, https_1.onCall)(async (request) => {
    const { tenantId, promotionId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !promotionId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y promotionId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('promotions')
            .doc(promotionId)
            .update({
            status: 'paused',
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al pausar promoción: ${error.message}`);
    }
});
// Eliminar promoción
exports.deletePromotion = (0, https_1.onCall)(async (request) => {
    const { tenantId, promotionId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !promotionId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y promotionId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('promotions')
            .doc(promotionId)
            .delete();
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al eliminar promoción: ${error.message}`);
    }
});
// Enviar promoción a leads
exports.sendPromotionToLeadsFunction = (0, https_1.onCall)(async (request) => {
    const { tenantId, promotionId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !promotionId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y promotionId son requeridos');
    }
    try {
        await (0, core_1.sendPromotionToLeads)(tenantId, promotionId);
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al enviar promoción a leads: ${error.message}`);
    }
});
//# sourceMappingURL=promotions.js.map
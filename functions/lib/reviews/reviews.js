"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondToReview = exports.approveReview = exports.updateReview = exports.getReviews = exports.createReview = void 0;
// Cloud Functions para Reviews
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Crear review
exports.createReview = (0, https_1.onCall)(async (request) => {
    const { tenantId, review } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !review) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y review son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('reviews')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, review), { status: 'pending', createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al crear review: ${error.message}`);
    }
});
// Obtener reviews
exports.getReviews = (0, https_1.onCall)(async (request) => {
    const { tenantId, status, sellerId, vehicleId, limit } = request.data;
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
            .collection('reviews');
        if (status) {
            query = query.where('status', '==', status);
        }
        if (sellerId) {
            query = query.where('sellerId', '==', sellerId);
        }
        if (vehicleId) {
            query = query.where('vehicleId', '==', vehicleId);
        }
        query = query.orderBy('createdAt', 'desc').limit(limit || 100);
        const snapshot = await query.get();
        const reviews = snapshot.docs.map((doc) => {
            var _a, _b;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }));
        });
        return { reviews };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener reviews: ${error.message}`);
    }
});
// Actualizar review
exports.updateReview = (0, https_1.onCall)(async (request) => {
    const { tenantId, reviewId, updates } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !reviewId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, reviewId y updates son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('reviews')
            .doc(reviewId)
            .update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al actualizar review: ${error.message}`);
    }
});
// Aprobar review
exports.approveReview = (0, https_1.onCall)(async (request) => {
    const { tenantId, reviewId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !reviewId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y reviewId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('reviews')
            .doc(reviewId)
            .update({
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: auth.uid,
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al aprobar review: ${error.message}`);
    }
});
// Responder review
exports.respondToReview = (0, https_1.onCall)(async (request) => {
    const { tenantId, reviewId, response } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !reviewId || !response) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, reviewId y response son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('reviews')
            .doc(reviewId)
            .update({
            response,
            respondedAt: new Date(),
            respondedBy: auth.uid,
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al responder review: ${error.message}`);
    }
});
//# sourceMappingURL=reviews.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordBannerClick = exports.rejectBanner = exports.approveBanner = exports.getPublicBanners = exports.getBanners = exports.createBanner = void 0;
// Cloud Functions para Banners
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Crear/solicitar banner premium
exports.createBanner = (0, https_1.onCall)(async (request) => {
    const { tenantId, banner } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !banner) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y banner son requeridos');
    }
    try {
        // Verificar límite global (4 banners activos máximo)
        const activeBannersSnapshot = await db
            .collectionGroup('premium_banners')
            .where('status', '==', 'active')
            .where('approved', '==', true)
            .get();
        if (activeBannersSnapshot.size >= 4) {
            throw new https_1.HttpsError('resource-exhausted', 'Límite de banners activos alcanzado');
        }
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('premium_banners')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, banner), { status: 'pending', approved: false, views: 0, clicks: 0, createdAt: new Date(), updatedAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al crear banner: ${error.message}`);
    }
});
// Obtener banners
exports.getBanners = (0, https_1.onCall)(async (request) => {
    const { tenantId, status, approved } = request.data;
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
            .collection('premium_banners');
        if (status) {
            query = query.where('status', '==', status);
        }
        if (approved !== undefined) {
            query = query.where('approved', '==', approved);
        }
        query = query.orderBy('createdAt', 'desc').limit(100);
        const snapshot = await query.get();
        const banners = snapshot.docs.map((doc) => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), expiresAt: (_c = doc.data().expiresAt) === null || _c === void 0 ? void 0 : _c.toDate() }));
        });
        return { banners };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener banners: ${error.message}`);
    }
});
// Obtener banners públicos (para web pública)
exports.getPublicBanners = (0, https_1.onCall)(async (request) => {
    try {
        const snapshot = await db
            .collectionGroup('premium_banners')
            .where('status', '==', 'active')
            .where('approved', '==', true)
            .orderBy('priority', 'desc')
            .limit(4)
            .get();
        const banners = snapshot.docs.map((doc) => {
            var _a, _b;
            const data = doc.data();
            const pathParts = doc.ref.path.split('/');
            const tenantId = pathParts[1];
            return Object.assign(Object.assign({ id: doc.id, tenantId }, data), { createdAt: (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), expiresAt: (_b = data.expiresAt) === null || _b === void 0 ? void 0 : _b.toDate() });
        });
        return { banners };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener banners públicos: ${error.message}`);
    }
});
// Aprobar banner (admin)
exports.approveBanner = (0, https_1.onCall)(async (request) => {
    const { tenantId, bannerId } = request.data;
    const auth = request.auth;
    if (!auth || auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores');
    }
    if (!tenantId || !bannerId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y bannerId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('premium_banners')
            .doc(bannerId)
            .update({
            approved: true,
            approvedAt: new Date(),
            approvedBy: auth.uid,
            status: 'active',
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al aprobar banner: ${error.message}`);
    }
});
// Rechazar banner (admin)
exports.rejectBanner = (0, https_1.onCall)(async (request) => {
    const { tenantId, bannerId, reason } = request.data;
    const auth = request.auth;
    if (!auth || auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores');
    }
    if (!tenantId || !bannerId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y bannerId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('premium_banners')
            .doc(bannerId)
            .update({
            approved: false,
            status: 'rejected',
            rejectionReason: reason,
            rejectedAt: new Date(),
            rejectedBy: auth.uid,
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al rechazar banner: ${error.message}`);
    }
});
// Registrar click en banner
exports.recordBannerClick = (0, https_1.onCall)(async (request) => {
    const { tenantId, bannerId } = request.data;
    if (!tenantId || !bannerId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y bannerId son requeridos');
    }
    try {
        const bannerRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('premium_banners')
            .doc(bannerId);
        await bannerRef.update({
            clicks: db.FieldValue.increment(1),
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al registrar click: ${error.message}`);
    }
});
//# sourceMappingURL=banners.js.map
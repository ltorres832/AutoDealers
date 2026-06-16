"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pauseScheduledPost = exports.getSocialPosts = exports.schedulePost = exports.publishToInstagram = exports.publishToFacebook = void 0;
// Cloud Functions para Social Media
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("@autodealers/messaging");
const messaging_2 = require("@autodealers/messaging");
const db = (0, firestore_1.getFirestore)();
// Publicar en Facebook
exports.publishToFacebook = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, post } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !post) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y post son requeridos');
    }
    try {
        // Obtener credenciales de Facebook del tenant
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Tenant no encontrado');
        }
        const tenantData = tenantDoc.data();
        const facebookConfig = ((_a = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _a === void 0 ? void 0 : _a.facebook) || {};
        const accessToken = facebookConfig.accessToken || process.env.FACEBOOK_ACCESS_TOKEN || '';
        const pageId = facebookConfig.pageId || '';
        if (!accessToken || !pageId) {
            throw new https_1.HttpsError('failed-precondition', 'Credenciales de Facebook no configuradas');
        }
        const facebookService = new messaging_1.FacebookMessengerService(accessToken, pageId);
        const result = await facebookService.publishPost(post);
        // Guardar en Firestore
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('social_posts')
            .add(Object.assign(Object.assign({}, post), { platform: 'facebook', status: 'published', publishedAt: new Date(), externalId: result.id, createdAt: new Date() }));
        return { success: true, postId: result.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al publicar en Facebook: ${error.message}`);
    }
});
// Publicar en Instagram
exports.publishToInstagram = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, post } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !post) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y post son requeridos');
    }
    try {
        // Obtener credenciales de Instagram del tenant
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Tenant no encontrado');
        }
        const tenantData = tenantDoc.data();
        const instagramConfig = ((_a = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _a === void 0 ? void 0 : _a.instagram) || {};
        const accessToken = instagramConfig.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || '';
        const accountId = instagramConfig.accountId || '';
        if (!accessToken || !accountId) {
            throw new https_1.HttpsError('failed-precondition', 'Credenciales de Instagram no configuradas');
        }
        const instagramService = new messaging_2.InstagramMessagingService(accessToken, accountId);
        const result = await instagramService.publishPost(post);
        // Guardar en Firestore
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('social_posts')
            .add(Object.assign(Object.assign({}, post), { platform: 'instagram', status: 'published', publishedAt: new Date(), externalId: result.id, createdAt: new Date() }));
        return { success: true, postId: result.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al publicar en Instagram: ${error.message}`);
    }
});
// Programar post
exports.schedulePost = (0, https_1.onCall)(async (request) => {
    const { tenantId, post, scheduledAt } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !post || !scheduledAt) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, post y scheduledAt son requeridos');
    }
    try {
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('social_posts')
            .doc();
        await docRef.set(Object.assign(Object.assign({}, post), { status: 'scheduled', scheduledAt: new Date(scheduledAt), createdAt: new Date() }));
        return { id: docRef.id };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al programar post: ${error.message}`);
    }
});
// Obtener posts
exports.getSocialPosts = (0, https_1.onCall)(async (request) => {
    const { tenantId, status, platform, limit } = request.data;
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
            .collection('social_posts');
        if (status) {
            query = query.where('status', '==', status);
        }
        if (platform) {
            query = query.where('platform', '==', platform);
        }
        query = query.orderBy('createdAt', 'desc').limit(limit || 100);
        const snapshot = await query.get();
        const posts = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { posts };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener posts: ${error.message}`);
    }
});
// Pausar post programado
exports.pauseScheduledPost = (0, https_1.onCall)(async (request) => {
    const { tenantId, postId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !postId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId y postId son requeridos');
    }
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('social_posts')
            .doc(postId)
            .update({
            status: 'paused',
            updatedAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al pausar post: ${error.message}`);
    }
});
//# sourceMappingURL=social.js.map
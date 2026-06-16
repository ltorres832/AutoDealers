"use strict";
/**
 * Cloud Functions para Integrations
 *
 * Funcionalidades:
 * - Gestión de integraciones (WhatsApp, Facebook, Instagram, etc.)
 * - Guardar credenciales
 * - Conectar/desconectar integraciones
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectIntegration = exports.connectIntegration = exports.saveIntegrationCredentials = exports.getIntegrations = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener integraciones del tenant
 */
exports.getIntegrations = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const integrationsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .get();
    const integrations = integrationsSnapshot.docs.map((doc) => {
        var _a, _b, _c, _d;
        const data = doc.data();
        return {
            id: doc.id,
            type: data.type,
            status: data.status || 'inactive',
            tenantId,
            credentials: data.credentials ? {
                appId: data.credentials.appId || undefined,
                hasAppSecret: !!data.credentials.appSecret,
            } : undefined,
            createdAt: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || data.createdAt,
            updatedAt: ((_d = (_c = data.updatedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || data.updatedAt,
        };
    });
    return { integrations };
});
/**
 * Guardar credenciales de integración
 */
exports.saveIntegrationCredentials = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, type, credentials } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !type || !credentials) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const existingSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .where('type', '==', type)
        .get();
    let integrationRef;
    if (!existingSnapshot.empty) {
        integrationRef = existingSnapshot.docs[0].ref;
        await integrationRef.update({
            credentials: Object.assign(Object.assign({}, existingSnapshot.docs[0].data().credentials), credentials),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    else {
        integrationRef = db.collection('tenants').doc(tenantId).collection('integrations').doc();
        await integrationRef.set({
            type,
            status: 'pending',
            credentials,
            settings: {},
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    return {
        success: true,
        integrationId: integrationRef.id,
        message: 'Credenciales guardadas exitosamente',
    };
});
/**
 * Conectar integración
 */
exports.connectIntegration = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, type, credentials } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !type) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    if (type === 'whatsapp' && credentials) {
        const existingSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('integrations')
            .where('type', '==', 'whatsapp')
            .get();
        let integrationRef;
        if (!existingSnapshot.empty) {
            integrationRef = existingSnapshot.docs[0].ref;
            await integrationRef.update({
                status: 'active',
                credentials,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        else {
            integrationRef = db.collection('tenants').doc(tenantId).collection('integrations').doc();
            await integrationRef.set({
                type: 'whatsapp',
                status: 'active',
                credentials,
                settings: {},
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        return {
            success: true,
            integrationId: integrationRef.id,
            message: 'WhatsApp conectado exitosamente',
        };
    }
    // Para Facebook e Instagram, retornar URL de OAuth
    if (type === 'facebook' || type === 'instagram') {
        const credentialsDoc = await db.collection('system_settings').doc('credentials').get();
        const credentialsData = credentialsDoc.data();
        const appId = credentialsData === null || credentialsData === void 0 ? void 0 : credentialsData.metaAppId;
        const appSecret = credentialsData === null || credentialsData === void 0 ? void 0 : credentialsData.metaAppSecret;
        if (!appId || !appSecret) {
            throw new https_1.HttpsError('failed-precondition', 'Credenciales de Meta no configuradas');
        }
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
        const redirectUri = `${baseUrl}/api/settings/integrations/callback`;
        const scope = type === 'facebook'
            ? 'pages_manage_posts,pages_read_engagement,pages_messaging,instagram_basic,instagram_content_publish'
            : 'instagram_basic,instagram_content_publish,instagram_manage_messages';
        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${type}_${tenantId}`;
        return { authUrl };
    }
    throw new https_1.HttpsError('invalid-argument', 'Tipo de integración no válido');
});
/**
 * Desconectar integración
 */
exports.disconnectIntegration = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, integrationId } = request.data;
    const authToken = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token;
    if (!authToken || !tenantId || !integrationId) {
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    }
    const integrationRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .doc(integrationId);
    await integrationRef.update({
        status: 'inactive',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true, message: 'Integración desconectada exitosamente' };
});
//# sourceMappingURL=integrations.js.map
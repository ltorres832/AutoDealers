"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppNotification = exports.processWhatsAppWebhook = exports.sendWhatsAppMessage = void 0;
// Cloud Functions para WhatsApp
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("@autodealers/messaging");
const db = (0, firestore_1.getFirestore)();
// Enviar mensaje WhatsApp
exports.sendWhatsAppMessage = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, to, content, leadId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !to || !content) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, to y content son requeridos');
    }
    try {
        // Obtener configuración de WhatsApp del tenant
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Tenant no encontrado');
        }
        const tenantData = tenantDoc.data();
        const whatsappConfig = ((_a = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _a === void 0 ? void 0 : _a.whatsapp) || {};
        const accessToken = whatsappConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
        const phoneNumberId = whatsappConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        if (!accessToken || !phoneNumberId) {
            throw new https_1.HttpsError('failed-precondition', 'Credenciales de WhatsApp no configuradas');
        }
        const whatsappService = new messaging_1.WhatsAppService(accessToken, phoneNumberId);
        const response = await whatsappService.sendMessage({
            tenantId,
            channel: 'whatsapp',
            direction: 'outbound',
            from: phoneNumberId,
            to,
            content,
            leadId,
        });
        // Guardar mensaje en Firestore si hay leadId
        if (leadId && response.status === 'sent') {
            await db
                .collection('tenants')
                .doc(tenantId)
                .collection('leads')
                .doc(leadId)
                .collection('messages')
                .add({
                channel: 'whatsapp',
                direction: 'outbound',
                from: phoneNumberId,
                to,
                content,
                status: 'sent',
                messageId: response.id,
                createdAt: new Date(),
            });
        }
        return { success: response.status === 'sent', messageId: response.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al enviar mensaje WhatsApp: ${error.message}`);
    }
});
// Procesar webhook de WhatsApp
exports.processWhatsAppWebhook = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const { webhookData } = request.data;
    if (!webhookData) {
        throw new https_1.HttpsError('invalid-argument', 'webhookData es requerido');
    }
    try {
        // Obtener tenantId del número de WhatsApp
        const phoneNumberId = ((_f = (_e = (_d = (_c = (_b = (_a = webhookData.entry) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.changes) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) === null || _e === void 0 ? void 0 : _e.metadata) === null || _f === void 0 ? void 0 : _f.phone_number_id) || '';
        if (!phoneNumberId) {
            return { received: true, error: 'No phone number ID' };
        }
        // Buscar tenant por número de WhatsApp
        const integrationsSnapshot = await db
            .collection('integrations')
            .where('type', '==', 'whatsapp')
            .where('phoneNumberId', '==', phoneNumberId)
            .where('status', '==', 'active')
            .limit(1)
            .get();
        let tenantId = null;
        if (!integrationsSnapshot.empty) {
            tenantId = integrationsSnapshot.docs[0].data().tenantId || null;
        }
        if (!tenantId) {
            return { received: true, error: 'Tenant not found' };
        }
        // Obtener configuración de WhatsApp
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            return { received: true, error: 'Tenant not found' };
        }
        const tenantData = tenantDoc.data();
        const whatsappConfig = ((_g = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _g === void 0 ? void 0 : _g.whatsapp) || {};
        const accessToken = whatsappConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
        const tenantPhoneNumberId = whatsappConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        if (!accessToken || !tenantPhoneNumberId) {
            return { received: true, error: 'WhatsApp not configured' };
        }
        const whatsappService = new messaging_1.WhatsAppService(accessToken, tenantPhoneNumberId);
        const messagePayload = await whatsappService.processWebhook(webhookData);
        if (!messagePayload) {
            return { received: true };
        }
        messagePayload.tenantId = tenantId;
        // Guardar mensaje en Firestore
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('messages')
            .add(Object.assign(Object.assign({}, messagePayload), { createdAt: new Date() }));
        return { received: true, processed: true };
    }
    catch (error) {
        console.error('Error processing WhatsApp webhook:', error);
        return { received: true, error: error.message };
    }
});
// Enviar notificación WhatsApp
exports.sendWhatsAppNotification = (0, https_1.onCall)(async (request) => {
    const { tenantId, userId, title, message } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !userId || !title || !message) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, userId, title y message son requeridos');
    }
    try {
        // Obtener teléfono del usuario
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Usuario no encontrado');
        }
        const userData = userDoc.data();
        const phone = userData === null || userData === void 0 ? void 0 : userData.phone;
        if (!phone) {
            throw new https_1.HttpsError('failed-precondition', 'Usuario no tiene teléfono configurado');
        }
        // Enviar WhatsApp
        const result = await (0, exports.sendWhatsAppMessage)({
            tenantId,
            to: phone,
            content: `${title}\n\n${message}`,
        });
        return result;
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al enviar notificación WhatsApp: ${error.message}`);
    }
});
//# sourceMappingURL=whatsapp.js.map
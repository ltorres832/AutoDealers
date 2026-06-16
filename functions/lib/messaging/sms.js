"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMSNotification = exports.sendBulkSMS = exports.sendSMS = void 0;
// Cloud Functions para SMS (Twilio)
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("@autodealers/messaging");
const db = (0, firestore_1.getFirestore)();
// Enviar SMS
exports.sendSMS = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, to, content } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !to || !content) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, to y content son requeridos');
    }
    try {
        // Obtener credenciales de Twilio del tenant
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Tenant no encontrado');
        }
        const tenantData = tenantDoc.data();
        const smsConfig = ((_a = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _a === void 0 ? void 0 : _a.sms) || {};
        const accountSid = smsConfig.accountSid || process.env.TWILIO_ACCOUNT_SID || '';
        const authToken = smsConfig.authToken || process.env.TWILIO_AUTH_TOKEN || '';
        const phoneNumber = smsConfig.phoneNumber || process.env.TWILIO_PHONE_NUMBER || '';
        if (!accountSid || !authToken || !phoneNumber) {
            throw new https_1.HttpsError('failed-precondition', 'Credenciales de Twilio no configuradas');
        }
        const smsService = new messaging_1.SMSService(accountSid, authToken, phoneNumber);
        const response = await smsService.sendSMS({
            tenantId,
            channel: 'sms',
            direction: 'outbound',
            from: phoneNumber,
            to,
            content,
        });
        return { success: response.status === 'sent', messageId: response.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al enviar SMS: ${error.message}`);
    }
});
// Enviar SMS en bulk
exports.sendBulkSMS = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, recipients, content } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !recipients || !Array.isArray(recipients) || !content) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, recipients (array) y content son requeridos');
    }
    try {
        // Obtener credenciales de Twilio
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Tenant no encontrado');
        }
        const tenantData = tenantDoc.data();
        const smsConfig = ((_a = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _a === void 0 ? void 0 : _a.sms) || {};
        const accountSid = smsConfig.accountSid || process.env.TWILIO_ACCOUNT_SID || '';
        const authToken = smsConfig.authToken || process.env.TWILIO_AUTH_TOKEN || '';
        const phoneNumber = smsConfig.phoneNumber || process.env.TWILIO_PHONE_NUMBER || '';
        if (!accountSid || !authToken || !phoneNumber) {
            throw new https_1.HttpsError('failed-precondition', 'Credenciales de Twilio no configuradas');
        }
        const smsService = new messaging_1.SMSService(accountSid, authToken, phoneNumber);
        // Enviar a cada destinatario
        const results = await Promise.allSettled(recipients.map((to) => smsService.sendSMS({
            tenantId,
            channel: 'sms',
            direction: 'outbound',
            from: phoneNumber,
            to,
            content,
        })));
        const successful = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;
        return {
            success: true,
            total: recipients.length,
            successful,
            failed,
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al enviar SMS en bulk: ${error.message}`);
    }
});
// Enviar notificación SMS
exports.sendSMSNotification = (0, https_1.onCall)(async (request) => {
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
        // Enviar SMS
        const result = await (0, exports.sendSMS)({
            tenantId,
            to: phone,
            content: `${title}\n\n${message}`,
        });
        return result;
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al enviar notificación SMS: ${error.message}`);
    }
});
//# sourceMappingURL=sms.js.map
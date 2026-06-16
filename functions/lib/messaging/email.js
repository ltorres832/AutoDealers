"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBulkEmail = exports.sendEmailTemplate = exports.sendEmail = void 0;
// Cloud Functions para Emails
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("@autodealers/messaging");
const db = (0, firestore_1.getFirestore)();
// Enviar email
exports.sendEmail = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, to, subject, content, from, metadata } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !to || !subject || !content) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, to, subject y content son requeridos');
    }
    try {
        // Obtener credenciales de email del tenant
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Tenant no encontrado');
        }
        const tenantData = tenantDoc.data();
        const emailConfig = ((_a = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _a === void 0 ? void 0 : _a.email) || {};
        const emailApiKey = emailConfig.apiKey || process.env.EMAIL_API_KEY || '';
        if (!emailApiKey) {
            throw new https_1.HttpsError('failed-precondition', 'Email API Key no configurada');
        }
        const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_')
            ? 'resend'
            : 'sendgrid';
        const emailService = new messaging_1.EmailService(emailApiKey, emailProvider);
        const response = await emailService.sendEmail({
            tenantId,
            channel: 'email',
            direction: 'outbound',
            from: from || emailConfig.fromAddress || 'noreply@autodealers.com',
            to,
            content,
            metadata: Object.assign({ subject }, metadata),
        });
        return { success: response.status === 'sent', messageId: response.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al enviar email: ${error.message}`);
    }
});
// Enviar email con template
exports.sendEmailTemplate = (0, https_1.onCall)(async (request) => {
    const { tenantId, to, templateId, variables } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !to || !templateId) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, to y templateId son requeridos');
    }
    try {
        // Obtener template
        const templateDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('templates')
            .doc(templateId)
            .get();
        if (!templateDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Template no encontrado');
        }
        const template = templateDoc.data();
        let content = (template === null || template === void 0 ? void 0 : template.content) || '';
        const subject = (template === null || template === void 0 ? void 0 : template.subject) || '';
        // Reemplazar variables
        if (variables) {
            Object.keys(variables).forEach((key) => {
                content = content.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
            });
        }
        // Enviar email
        const emailConfig = (template === null || template === void 0 ? void 0 : template.emailConfig) || {};
        const emailApiKey = emailConfig.apiKey || process.env.EMAIL_API_KEY || '';
        if (!emailApiKey) {
            throw new https_1.HttpsError('failed-precondition', 'Email API Key no configurada');
        }
        const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_')
            ? 'resend'
            : 'sendgrid';
        const emailService = new messaging_1.EmailService(emailApiKey, emailProvider);
        const response = await emailService.sendEmail({
            tenantId,
            channel: 'email',
            direction: 'outbound',
            from: emailConfig.fromAddress || 'noreply@autodealers.com',
            to,
            content,
            metadata: {
                subject: subject || 'Mensaje de AutoDealers',
            },
        });
        return { success: response.status === 'sent', messageId: response.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al enviar email con template: ${error.message}`);
    }
});
// Enviar emails en bulk
exports.sendBulkEmail = (0, https_1.onCall)(async (request) => {
    var _a;
    const { tenantId, recipients, subject, content, from } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !recipients || !Array.isArray(recipients) || !subject || !content) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, recipients (array), subject y content son requeridos');
    }
    try {
        // Obtener credenciales de email
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Tenant no encontrado');
        }
        const tenantData = tenantDoc.data();
        const emailConfig = ((_a = tenantData === null || tenantData === void 0 ? void 0 : tenantData.settings) === null || _a === void 0 ? void 0 : _a.email) || {};
        const emailApiKey = emailConfig.apiKey || process.env.EMAIL_API_KEY || '';
        if (!emailApiKey) {
            throw new https_1.HttpsError('failed-precondition', 'Email API Key no configurada');
        }
        const emailProvider = emailApiKey.includes('re_') || emailApiKey.startsWith('re_')
            ? 'resend'
            : 'sendgrid';
        const emailService = new messaging_1.EmailService(emailApiKey, emailProvider);
        // Enviar a cada destinatario
        const results = await Promise.allSettled(recipients.map((to) => emailService.sendEmail({
            tenantId,
            channel: 'email',
            direction: 'outbound',
            from: from || emailConfig.fromAddress || 'noreply@autodealers.com',
            to,
            content,
            metadata: {
                subject,
            },
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
        throw new https_1.HttpsError('internal', `Error al enviar emails en bulk: ${error.message}`);
    }
});
//# sourceMappingURL=email.js.map
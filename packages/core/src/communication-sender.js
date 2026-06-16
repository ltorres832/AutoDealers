"use strict";
// Sistema de envío automático de comunicaciones
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAutomaticCommunication = sendAutomaticCommunication;
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("@autodealers/shared");
const communication_templates_1 = require("./communication-templates");
const users_1 = require("./users");
const tenants_1 = require("./tenants");
const communication_logs_1 = require("./communication-logs");
/**
 * Envía una comunicación automática según el evento
 */
async function sendAutomaticCommunication(event, type, subscriptionId, additionalVariables) {
    try {
        // Obtener template activo para el evento
        const template = await (0, communication_templates_1.getActiveTemplateForEvent)(event, type);
        if (!template) {
            console.warn(`No template found for event ${event} and type ${type}`);
            return { success: false, error: 'Template not found' };
        }
        // Obtener datos de la suscripción (import dinámico para evitar dependencia circular)
        const { getSubscriptionById } = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
        const subscription = await getSubscriptionById(subscriptionId);
        if (!subscription) {
            return { success: false, error: 'Subscription not found' };
        }
        // Obtener datos del usuario
        const user = await (0, users_1.getUserById)(subscription.userId);
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        // Obtener datos del tenant
        const tenant = await (0, tenants_1.getTenantById)(subscription.tenantId);
        if (!tenant) {
            return { success: false, error: 'Tenant not found' };
        }
        // Obtener datos de la membresía (import dinámico para evitar dependencia circular)
        const { getMembershipById } = await Promise.resolve().then(() => __importStar(require('@autodealers/billing')));
        const membership = await getMembershipById(subscription.membershipId);
        if (!membership) {
            return { success: false, error: 'Membership not found' };
        }
        // Preparar variables
        const variables = {
            userName: user.name,
            userEmail: user.email,
            tenantName: tenant.name,
            membershipName: membership.name,
            amount: membership.price,
            currency: membership.currency,
            periodStart: subscription.currentPeriodStart.toLocaleDateString('es-ES'),
            periodEnd: subscription.currentPeriodEnd.toLocaleDateString('es-ES'),
            daysPastDue: subscription.daysPastDue || 0,
            ...additionalVariables,
        };
        // Reemplazar variables en el template
        const processedContent = (0, communication_templates_1.replaceTemplateVariables)(template, variables);
        const processedSubject = template.subject
            ? (0, communication_templates_1.replaceTemplateSubject)(template, variables)
            : undefined;
        // Enviar según el tipo
        let result;
        switch (type) {
            case 'email':
                result = await sendEmail(user.email, processedSubject || '', processedContent);
                break;
            case 'sms':
                result = await sendSMS(user.email, processedContent);
                break;
            case 'whatsapp':
                result = await sendWhatsApp(user.email, processedContent);
                break;
            default:
                result = { success: false, error: 'Invalid communication type' };
        }
        // Registrar en logs
        try {
            await (0, communication_logs_1.logCommunication)({
                templateId: template.id,
                templateName: template.name,
                event,
                type,
                recipientId: user.id,
                recipientEmail: user.email,
                recipientName: user.name || user.email,
                tenantId: subscription.tenantId,
                tenantName: tenant.name,
                status: result.success ? 'success' : 'failed',
                messageId: result.messageId,
                error: result.error,
                metadata: {
                    subscriptionId,
                    membershipName: membership.name,
                },
            });
        }
        catch (logError) {
            console.error('Error logging communication:', logError);
            // No fallar el envío por error de logging
        }
        return result;
    }
    catch (error) {
        console.error('Error sending automatic communication:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Envía un email
 */
async function sendEmail(to, subject, content) {
    try {
        // TODO: Implementar con servicio de email (SendGrid, AWS SES, etc.)
        // Por ahora, solo registrar
        console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
        console.log(`[EMAIL] Content: ${content}`);
        // Registrar en Firestore para tracking
        const { getFirestore } = await Promise.resolve().then(() => __importStar(require('./firebase')));
        const db = getFirestore();
        await db.collection('communication_logs').add({
            type: 'email',
            to,
            subject,
            content,
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, messageId: `email_${Date.now()}` };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Email send failed'
        };
    }
}
/**
 * Envía un SMS
 */
async function sendSMS(to, content) {
    try {
        // TODO: Implementar con servicio de SMS (Twilio, AWS SNS, etc.)
        console.log(`[SMS] To: ${to}, Content: ${content}`);
        // Registrar en Firestore
        const db = (0, shared_1.getFirestore)();
        await db.collection('communication_logs').add({
            type: 'sms',
            to,
            content,
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, messageId: `sms_${Date.now()}` };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'SMS send failed'
        };
    }
}
/**
 * Envía un mensaje de WhatsApp
 */
async function sendWhatsApp(to, content) {
    try {
        // TODO: Implementar con WhatsApp Business API
        console.log(`[WHATSAPP] To: ${to}, Content: ${content}`);
        // Registrar en Firestore
        const db = (0, shared_1.getFirestore)();
        await db.collection('communication_logs').add({
            type: 'whatsapp',
            to,
            content,
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, messageId: `whatsapp_${Date.now()}` };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'WhatsApp send failed'
        };
    }
}

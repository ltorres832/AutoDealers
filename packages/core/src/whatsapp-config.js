"use strict";
// Gestión de configuración de WhatsApp por tenant
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
exports.getWhatsAppConfig = getWhatsAppConfig;
exports.saveWhatsAppConfig = saveWhatsAppConfig;
exports.getWhatsAppAccessToken = getWhatsAppAccessToken;
exports.getWhatsAppPhoneNumberId = getWhatsAppPhoneNumberId;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Obtiene la configuración de WhatsApp de un tenant
 */
async function getWhatsAppConfig(tenantId) {
    try {
        // Buscar en integraciones del tenant
        const integrationsSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('integrations')
            .where('type', '==', 'whatsapp')
            .where('status', '==', 'active')
            .limit(1)
            .get();
        if (integrationsSnapshot.empty) {
            return null;
        }
        const integration = integrationsSnapshot.docs[0].data();
        const cred = (integration.credentials || {});
        const phoneNumberId = String(integration.phoneNumberId || cred.phoneNumberId || cred.phone_number_id || '').trim();
        const accessToken = String(integration.accessToken || cred.accessToken || cred.longLivedUserToken || '').trim();
        if (!phoneNumberId || !accessToken) {
            return null;
        }
        return {
            enabled: true,
            phoneNumberId,
            accessToken,
            verifyToken: integration.verifyToken,
            webhookUrl: integration.webhookUrl,
            autoRespond: integration.autoRespond || false,
            businessName: integration.businessName,
            businessDescription: integration.businessDescription,
            workingHours: integration.workingHours,
            awayMessage: integration.awayMessage,
            createdAt: integration.createdAt?.toDate(),
            updatedAt: integration.updatedAt?.toDate(),
        };
    }
    catch (error) {
        console.error('Error obteniendo configuración de WhatsApp:', error);
        return null;
    }
}
/**
 * Guarda la configuración de WhatsApp de un tenant
 */
async function saveWhatsAppConfig(tenantId, config) {
    try {
        // Buscar integración existente
        const integrationsSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('integrations')
            .where('type', '==', 'whatsapp')
            .limit(1)
            .get();
        const integrationData = {
            type: 'whatsapp',
            status: config.enabled !== false ? 'active' : 'inactive',
            phoneNumberId: config.phoneNumberId,
            accessToken: config.accessToken, // TODO: Encriptar
            verifyToken: config.verifyToken,
            webhookUrl: config.webhookUrl,
            autoRespond: config.autoRespond || false,
            businessName: config.businessName,
            businessDescription: config.businessDescription,
            workingHours: config.workingHours,
            awayMessage: config.awayMessage,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (integrationsSnapshot.empty) {
            // Crear nueva integración
            await db
                .collection('tenants')
                .doc(tenantId)
                .collection('integrations')
                .doc()
                .set({
                ...integrationData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        else {
            // Actualizar integración existente
            await integrationsSnapshot.docs[0].ref.update(integrationData);
        }
    }
    catch (error) {
        console.error('Error guardando configuración de WhatsApp:', error);
        throw error;
    }
}
/**
 * Obtiene el access token de WhatsApp de un tenant (desencriptado)
 */
async function getWhatsAppAccessToken(tenantId) {
    try {
        const config = await getWhatsAppConfig(tenantId);
        if (!config || !config.enabled) {
            return null;
        }
        // TODO: Desencriptar el token
        return config.accessToken;
    }
    catch (error) {
        console.error('Error obteniendo access token de WhatsApp:', error);
        return null;
    }
}
/**
 * Obtiene el phone number ID de WhatsApp de un tenant
 */
async function getWhatsAppPhoneNumberId(tenantId) {
    try {
        const config = await getWhatsAppConfig(tenantId);
        if (!config || !config.enabled) {
            return null;
        }
        return config.phoneNumberId;
    }
    catch (error) {
        console.error('Error obteniendo phone number ID de WhatsApp:', error);
        return null;
    }
}

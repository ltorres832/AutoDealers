"use strict";
// Gestión de configuración de IA por tenant
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
exports.getAIConfig = getAIConfig;
exports.updateAIConfig = updateAIConfig;
exports.getAIApiKey = getAIApiKey;
exports.isAIEnabled = isAIEnabled;
exports.getAIModel = getAIModel;
exports.canAutoRespond = canAutoRespond;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
const DEFAULT_AI_CONFIG = {
    enabled: false,
    provider: 'none',
    autoClassifyLeads: false,
    autoRespondMessages: false,
    autoRespondEmails: false,
    autoSuggestFollowUps: false,
    autoGenerateContent: false,
    classificationSettings: {
        enabled: false,
        model: 'gpt-4-turbo-preview',
        temperature: 0.3,
    },
    responseSettings: {
        enabled: false,
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 200,
        requireApproval: true,
        minConfidence: 0.7,
    },
    contentSettings: {
        enabled: false,
        model: 'gpt-4-turbo-preview',
        temperature: 0.8,
        style: 'professional',
    },
    advancedSettings: {
        sentimentAnalysis: false,
        intentDetection: false,
        leadScoring: false,
        conversationSummarization: false,
    },
};
/**
 * Obtiene la configuración de IA de un tenant
 */
async function getAIConfig(tenantId) {
    try {
        const configDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('ai')
            .get();
        if (!configDoc.exists) {
            return DEFAULT_AI_CONFIG;
        }
        const data = configDoc.data();
        return {
            ...DEFAULT_AI_CONFIG,
            ...data,
            createdAt: data?.createdAt?.toDate(),
            updatedAt: data?.updatedAt?.toDate(),
        };
    }
    catch (error) {
        console.error('Error obteniendo configuración de IA:', error);
        return DEFAULT_AI_CONFIG;
    }
}
/**
 * Actualiza la configuración de IA de un tenant
 */
async function updateAIConfig(tenantId, updates) {
    try {
        const configRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('ai');
        await configRef.set({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (error) {
        console.error('Error actualizando configuración de IA:', error);
        throw error;
    }
}
/**
 * Obtiene la API key de IA de un tenant (desencriptada)
 */
async function getAIApiKey(tenantId) {
    try {
        const config = await getAIConfig(tenantId);
        if (!config.enabled || !config.apiKey) {
            return null;
        }
        // TODO: Desencriptar la API key
        // Por ahora retornamos directamente (en producción debe estar encriptada)
        return config.apiKey;
    }
    catch (error) {
        console.error('Error obteniendo API key de IA:', error);
        return null;
    }
}
/**
 * Verifica si la IA está habilitada para un tenant
 */
async function isAIEnabled(tenantId) {
    const config = await getAIConfig(tenantId);
    return config.enabled && config.provider !== 'none' && !!config.apiKey;
}
/**
 * Obtiene el modelo de IA configurado para un tenant
 */
async function getAIModel(tenantId, type = 'classification') {
    const config = await getAIConfig(tenantId);
    switch (type) {
        case 'classification':
            return config.classificationSettings.model || 'gpt-4-turbo-preview';
        case 'response':
            return config.responseSettings.model || 'gpt-4-turbo-preview';
        case 'content':
            return config.contentSettings.model || 'gpt-4-turbo-preview';
        default:
            return config.model || 'gpt-4-turbo-preview';
    }
}
/**
 * Verifica si la IA puede responder automáticamente para un canal específico
 */
async function canAutoRespond(tenantId, channel) {
    const config = await getAIConfig(tenantId);
    if (!config.enabled || !config.responseSettings.enabled) {
        return false;
    }
    if (channel === 'emails') {
        return config.autoRespondEmails || false;
    }
    else {
        return config.autoRespondMessages || false;
    }
}

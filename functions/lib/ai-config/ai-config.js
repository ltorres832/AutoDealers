"use strict";
// Cloud Functions para configuración completa de IA
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
exports.updateTenantAIConfig = exports.getTenantAIConfig = exports.updateAIConfig = exports.getAIConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener configuración de IA
 */
exports.getAIConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can view AI config');
        }
        const configDoc = await db.collection('admin_config').doc('ai').get();
        if (!configDoc.exists) {
            // Configuración por defecto
            const defaultConfig = {
                enabled: false,
                provider: 'openai', // 'openai' | 'anthropic'
                openai: {
                    apiKey: '', // No se retorna
                    model: 'gpt-4-turbo-preview',
                    temperature: 0.7,
                    maxTokens: 200,
                },
                anthropic: {
                    apiKey: '', // No se retorna
                    model: 'claude-3-opus-20240229',
                    temperature: 0.7,
                    maxTokens: 200,
                },
                features: {
                    autoResponses: {
                        enabled: true,
                        requireApproval: true,
                        minConfidence: 0.7,
                    },
                    leadClassification: {
                        enabled: true,
                        autoUpdate: true,
                    },
                    sentimentAnalysis: {
                        enabled: true,
                    },
                    contentGeneration: {
                        enabled: true,
                    },
                    reportGeneration: {
                        enabled: true,
                    },
                },
                tenantConfigs: {}, // Configuraciones específicas por tenant
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await db.collection('admin_config').doc('ai').set(defaultConfig);
            return {
                config: Object.assign(Object.assign({}, defaultConfig), { openai: Object.assign(Object.assign({}, defaultConfig.openai), { apiKey: '***' }), anthropic: Object.assign(Object.assign({}, defaultConfig.anthropic), { apiKey: '***' }) }),
            };
        }
        const config = configDoc.data();
        return {
            config: Object.assign(Object.assign({}, config), { openai: Object.assign(Object.assign({}, config.openai), { apiKey: '***' }), anthropic: Object.assign(Object.assign({}, config.anthropic), { apiKey: '***' }) }),
        };
    }
    catch (error) {
        console.error('Error getting AI config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get AI config: ${error.message}`);
    }
});
/**
 * Actualizar configuración de IA (solo admin)
 */
exports.updateAIConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    var _a, _b;
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can update AI config');
        }
        const { config } = request.data;
        if (!config) {
            throw new https_1.HttpsError('invalid-argument', 'Config is required');
        }
        // Actualizar configuración
        const updateData = Object.assign(Object.assign({}, config), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        // No actualizar si el valor es '***' (indicando que no se quiere cambiar)
        if (((_a = updateData.openai) === null || _a === void 0 ? void 0 : _a.apiKey) === '***') {
            delete updateData.openai.apiKey;
        }
        if (((_b = updateData.anthropic) === null || _b === void 0 ? void 0 : _b.apiKey) === '***') {
            delete updateData.anthropic.apiKey;
        }
        await db.collection('admin_config').doc('ai').set(updateData, { merge: true });
        return { success: true, message: 'AI configuration updated successfully' };
    }
    catch (error) {
        console.error('Error updating AI config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update AI config: ${error.message}`);
    }
});
/**
 * Obtener configuración de IA para un tenant específico
 */
exports.getTenantAIConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId } = request.data;
        if (!tenantId) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID is required');
        }
        // Obtener configuración global
        const globalConfigDoc = await db.collection('admin_config').doc('ai').get();
        const globalConfig = globalConfigDoc.data() || {};
        // Obtener configuración específica del tenant
        const tenantConfig = ((_a = globalConfig.tenantConfigs) === null || _a === void 0 ? void 0 : _a[tenantId]) || {};
        // Combinar configuraciones (tenant override global)
        const mergedConfig = {
            enabled: tenantConfig.enabled !== undefined ? tenantConfig.enabled : globalConfig.enabled || false,
            provider: tenantConfig.provider || globalConfig.provider || 'openai',
            features: {
                autoResponses: Object.assign(Object.assign({}, (_b = globalConfig.features) === null || _b === void 0 ? void 0 : _b.autoResponses), (_c = tenantConfig.features) === null || _c === void 0 ? void 0 : _c.autoResponses),
                leadClassification: Object.assign(Object.assign({}, (_d = globalConfig.features) === null || _d === void 0 ? void 0 : _d.leadClassification), (_e = tenantConfig.features) === null || _e === void 0 ? void 0 : _e.leadClassification),
                sentimentAnalysis: Object.assign(Object.assign({}, (_f = globalConfig.features) === null || _f === void 0 ? void 0 : _f.sentimentAnalysis), (_g = tenantConfig.features) === null || _g === void 0 ? void 0 : _g.sentimentAnalysis),
                contentGeneration: Object.assign(Object.assign({}, (_h = globalConfig.features) === null || _h === void 0 ? void 0 : _h.contentGeneration), (_j = tenantConfig.features) === null || _j === void 0 ? void 0 : _j.contentGeneration),
                reportGeneration: Object.assign(Object.assign({}, (_k = globalConfig.features) === null || _k === void 0 ? void 0 : _k.reportGeneration), (_l = tenantConfig.features) === null || _l === void 0 ? void 0 : _l.reportGeneration),
            },
        };
        return { config: mergedConfig };
    }
    catch (error) {
        console.error('Error getting tenant AI config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get tenant AI config: ${error.message}`);
    }
});
/**
 * Actualizar configuración de IA para un tenant específico
 */
exports.updateTenantAIConfig = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, config } = request.data;
        if (!tenantId || !config) {
            throw new https_1.HttpsError('invalid-argument', 'Tenant ID and config are required');
        }
        // Obtener configuración global
        const globalConfigDoc = await db.collection('admin_config').doc('ai').get();
        const globalConfig = globalConfigDoc.data() || {};
        // Actualizar configuración específica del tenant
        const tenantConfigs = globalConfig.tenantConfigs || {};
        tenantConfigs[tenantId] = Object.assign(Object.assign({}, tenantConfigs[tenantId]), config);
        await db.collection('admin_config').doc('ai').update({
            tenantConfigs,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: 'Tenant AI configuration updated successfully' };
    }
    catch (error) {
        console.error('Error updating tenant AI config:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update tenant AI config: ${error.message}`);
    }
});
//# sourceMappingURL=ai-config.js.map
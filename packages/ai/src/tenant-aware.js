"use strict";
// Servicios de IA con soporte multi-tenant y configuración personalizada
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
exports.classifyLeadWithTenantConfig = classifyLeadWithTenantConfig;
exports.generateResponseWithTenantConfig = generateResponseWithTenantConfig;
exports.analyzeSentimentWithTenantConfig = analyzeSentimentWithTenantConfig;
exports.suggestFollowUpsWithTenantConfig = suggestFollowUpsWithTenantConfig;
const classification_1 = require("./classification");
const assistant_1 = require("./assistant");
const core_1 = require("@autodealers/core");
/**
 * Clasifica un lead usando la configuración del tenant
 */
async function classifyLeadWithTenantConfig(tenantId, leadInfo) {
    try {
        // Verificar si la IA está habilitada
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return null;
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        // Verificar si la clasificación automática está habilitada
        if (!config.autoClassifyLeads || !config.classificationSettings.enabled) {
            return null;
        }
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return null;
        }
        const classifier = new classification_1.AIClassifier(apiKey);
        // Usar prompt personalizado si existe
        if (config.classificationSettings.customPrompt) {
            // TODO: Implementar uso de prompt personalizado
        }
        const classification = await classifier.classifyLead(leadInfo);
        return classification;
    }
    catch (error) {
        console.error('Error clasificando lead con configuración de tenant:', error);
        return null;
    }
}
/**
 * Genera una respuesta automática usando la configuración del tenant y el perfil expandido del negocio
 */
async function generateResponseWithTenantConfig(tenantId, context, message, leadHistory) {
    try {
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return null;
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        // Verificar configuración de respuestas automáticas desde el dashboard
        const { getFirestore } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
        const db = getFirestore();
        const aiConfigDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('ai_config')
            .get();
        const aiDashboardConfig = aiConfigDoc.exists ? aiConfigDoc.data() : null;
        // Verificar si las respuestas automáticas están habilitadas
        if (!aiDashboardConfig?.enabled || !aiDashboardConfig?.autoResponses?.enabled) {
            return null;
        }
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return null;
        }
        // Obtener perfil expandido del negocio
        const profileQuestions = aiDashboardConfig?.profileQuestions || {};
        // Construir system prompt usando el perfil expandido
        let systemPrompt = `Eres un asistente de ventas de autos profesional trabajando para ${profileQuestions.businessName || 'un concesionario'}. `;
        if (profileQuestions.businessType) {
            systemPrompt += `Tipo de negocio: ${profileQuestions.businessType}. `;
        }
        if (profileQuestions.location) {
            systemPrompt += `Ubicación: ${profileQuestions.location}. `;
        }
        if (profileQuestions.specialties) {
            systemPrompt += `Especialidades: ${profileQuestions.specialties}. `;
        }
        if (profileQuestions.uniqueSellingPoints) {
            systemPrompt += `Puntos únicos de venta: ${profileQuestions.uniqueSellingPoints}. `;
        }
        if (profileQuestions.pricingStrategy) {
            systemPrompt += `Estrategia de precios: ${profileQuestions.pricingStrategy}. `;
        }
        if (profileQuestions.paymentOptions) {
            systemPrompt += `Métodos de pago aceptados: ${profileQuestions.paymentOptions}. `;
        }
        if (profileQuestions.financingOptions) {
            systemPrompt += `Opciones de financiamiento: ${profileQuestions.financingOptions}. `;
        }
        if (profileQuestions.warrantyInfo) {
            systemPrompt += `Información de garantías: ${profileQuestions.warrantyInfo}. `;
        }
        if (profileQuestions.tradeInPolicy) {
            systemPrompt += `Política de cambio: ${profileQuestions.tradeInPolicy}. `;
        }
        if (profileQuestions.deliveryOptions) {
            systemPrompt += `Opciones de entrega: ${profileQuestions.deliveryOptions}. `;
        }
        if (profileQuestions.businessHours) {
            systemPrompt += `Horarios de atención: ${profileQuestions.businessHours}. `;
        }
        if (profileQuestions.responseStyle) {
            systemPrompt += `Estilo de respuesta preferido: ${profileQuestions.responseStyle}. `;
        }
        if (profileQuestions.commonQuestions) {
            systemPrompt += `Preguntas frecuentes y respuestas: ${profileQuestions.commonQuestions}. `;
        }
        if (profileQuestions.dealBreakers) {
            systemPrompt += `IMPORTANTE - Políticas estrictas (NUNCA hacer esto): ${profileQuestions.dealBreakers}. `;
        }
        if (profileQuestions.successStories) {
            systemPrompt += `Historias de éxito para mencionar: ${profileQuestions.successStories}. `;
        }
        if (profileQuestions.specialInstructions) {
            systemPrompt += `INSTRUCCIONES ESPECIALES: ${profileQuestions.specialInstructions}. `;
        }
        // Agregar reglas de automatización
        if (profileQuestions.autoResponseRules?.whenToRespond) {
            systemPrompt += `Reglas de respuesta automática: ${profileQuestions.autoResponseRules.whenToRespond}. `;
        }
        if (profileQuestions.autoResponseRules?.whenToEscalate) {
            systemPrompt += `Cuándo escalar a humano: ${profileQuestions.autoResponseRules.whenToEscalate}. `;
        }
        systemPrompt += `Genera respuestas amigables, informativas y orientadas a ayudar al cliente. Mantén las respuestas concisas pero completas. `;
        if (profileQuestions.tone) {
            systemPrompt += `Usa un tono ${profileQuestions.tone}. `;
        }
        if (profileQuestions.language) {
            systemPrompt += `Responde en ${profileQuestions.language === 'es' ? 'español' : profileQuestions.language === 'en' ? 'inglés' : 'portugués'}. `;
        }
        // Usar OpenAI directamente con el prompt personalizado
        const OpenAI = (await Promise.resolve().then(() => __importStar(require('openai')))).default;
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model: config.responseSettings.model || 'gpt-4-turbo-preview',
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: `Contexto: ${context}\nHistorial: ${leadHistory?.join('\n') || 'Ninguno'}\nMensaje del cliente: ${message}\n\nGenera una respuesta apropiada:`
                },
            ],
            temperature: config.responseSettings.temperature || 0.7,
            max_tokens: config.responseSettings.maxTokens || 200,
        });
        const content = completion.choices[0]?.message?.content || '';
        // Calcular confianza
        const lengthScore = Math.min(content.length / 100, 1);
        const hasSpecificInfo = /(\d+|precio|modelo|año|marca|disponible|financiamiento|garantía)/i.test(content);
        const confidence = Math.min(lengthScore * 0.7 + (hasSpecificInfo ? 0.3 : 0), 1);
        const response = {
            content,
            confidence,
            requiresApproval: false,
        };
        // Verificar confianza mínima
        const minConfidence = aiDashboardConfig?.autoResponses?.requireApproval
            ? (config.responseSettings.minConfidence || 0.7)
            : 0.5;
        if (confidence < minConfidence) {
            response.requiresApproval = true;
        }
        // Verificar si requiere aprobación según configuración
        if (aiDashboardConfig?.autoResponses?.requireApproval && response.requiresApproval) {
            return response;
        }
        return response;
    }
    catch (error) {
        console.error('Error generando respuesta con configuración de tenant:', error);
        return null;
    }
}
/**
 * Analiza el sentimiento de un mensaje usando la configuración del tenant
 */
async function analyzeSentimentWithTenantConfig(tenantId, message) {
    try {
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return null;
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        if (!config.advancedSettings.sentimentAnalysis) {
            return null;
        }
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return null;
        }
        const classifier = new classification_1.AIClassifier(apiKey);
        return await classifier.analyzeSentiment(message);
    }
    catch (error) {
        console.error('Error analizando sentimiento con configuración de tenant:', error);
        return null;
    }
}
/**
 * Sugiere seguimientos usando la configuración del tenant
 */
async function suggestFollowUpsWithTenantConfig(tenantId, leadStatus, lastInteraction) {
    try {
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return [];
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        if (!config.autoSuggestFollowUps) {
            return [];
        }
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return [];
        }
        const assistant = new assistant_1.AIAssistant(apiKey);
        return await assistant.suggestFollowUp(leadStatus, lastInteraction);
    }
    catch (error) {
        console.error('Error sugiriendo seguimientos con configuración de tenant:', error);
        return [];
    }
}
//# sourceMappingURL=tenant-aware.js.map
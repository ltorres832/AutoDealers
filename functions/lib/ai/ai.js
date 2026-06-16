"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizePrice = exports.suggestVehicles = exports.analyzeConversation = exports.generateContent = exports.generateResponse = exports.classifyLead = void 0;
// Cloud Functions para IA
const https_1 = require("firebase-functions/v2/https");
const ai_1 = require("@autodealers/ai");
const ai_2 = require("@autodealers/ai");
const ai_3 = require("@autodealers/ai");
// Clasificar lead
exports.classifyLead = (0, https_1.onCall)(async (request) => {
    const { leadInfo } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!leadInfo) {
        throw new https_1.HttpsError('invalid-argument', 'leadInfo es requerido');
    }
    try {
        const apiKey = process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'OpenAI API Key no configurada');
        }
        const classifier = new ai_1.AIClassifier(apiKey);
        const classification = await classifier.classifyLead(leadInfo);
        return { classification };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al clasificar lead: ${error.message}`);
    }
});
// Generar respuesta automática
exports.generateResponse = (0, https_1.onCall)(async (request) => {
    const { context, message, leadHistory } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!context || !message) {
        throw new https_1.HttpsError('invalid-argument', 'context y message son requeridos');
    }
    try {
        const apiKey = process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'OpenAI API Key no configurada');
        }
        const assistant = new ai_2.AIAssistant(apiKey);
        const response = await assistant.generateResponse(context, message, leadHistory);
        return { response };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al generar respuesta: ${error.message}`);
    }
});
// Generar contenido
exports.generateContent = (0, https_1.onCall)(async (request) => {
    const { type, prompt, context } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!type || !prompt) {
        throw new https_1.HttpsError('invalid-argument', 'type y prompt son requeridos');
    }
    try {
        const apiKey = process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'OpenAI API Key no configurada');
        }
        const generator = new ai_3.AIContentGenerator(apiKey);
        const content = await generator.generateContent(type, prompt, context);
        return { content };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al generar contenido: ${error.message}`);
    }
});
// Analizar conversación
exports.analyzeConversation = (0, https_1.onCall)(async (request) => {
    const { messages } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!messages || !Array.isArray(messages)) {
        throw new https_1.HttpsError('invalid-argument', 'messages (array) es requerido');
    }
    try {
        const apiKey = process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'OpenAI API Key no configurada');
        }
        const assistant = new ai_2.AIAssistant(apiKey);
        const analysis = await assistant.analyzeConversation(messages);
        return { analysis };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al analizar conversación: ${error.message}`);
    }
});
// Sugerir vehículos
exports.suggestVehicles = (0, https_1.onCall)(async (request) => {
    const { tenantId, leadInfo, availableVehicles } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!tenantId || !leadInfo || !availableVehicles) {
        throw new https_1.HttpsError('invalid-argument', 'tenantId, leadInfo y availableVehicles son requeridos');
    }
    try {
        const apiKey = process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'OpenAI API Key no configurada');
        }
        // TODO: Implementar sugerencia de vehículos con IA
        return { suggestions: [] };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al sugerir vehículos: ${error.message}`);
    }
});
// Optimizar precio
exports.optimizePrice = (0, https_1.onCall)(async (request) => {
    const { vehicleId, marketData } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!vehicleId || !marketData) {
        throw new https_1.HttpsError('invalid-argument', 'vehicleId y marketData son requeridos');
    }
    try {
        const apiKey = process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'OpenAI API Key no configurada');
        }
        // TODO: Implementar optimización de precio con IA
        return { optimizedPrice: 0, reasoning: '' };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al optimizar precio: ${error.message}`);
    }
});
//# sourceMappingURL=ai.js.map
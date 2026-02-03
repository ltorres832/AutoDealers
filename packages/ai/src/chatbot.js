"use strict";
// Chatbot avanzado con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processChatbotMessage = processChatbotMessage;
exports.detectAndRespondInLanguage = detectAndRespondInLanguage;
const core_1 = require("@autodealers/core");
const inventory_1 = require("@autodealers/inventory");
const openai_1 = __importDefault(require("openai"));
const db = (0, core_1.getFirestore)();
/**
 * Procesa mensaje del chatbot y genera respuesta
 */
async function processChatbotMessage(tenantId, message, conversationHistory, apiKey, customInstructions) {
    try {
        const vehicles = await (0, inventory_1.getVehicles)(tenantId, { status: 'available' });
        const vehicleList = vehicles.slice(0, 20).map(v => `${v.year} ${v.make} ${v.model} - $${v.price}`).join('\n');
        const openai = new openai_1.default({ apiKey });
        const systemPrompt = `Eres un asistente virtual de ventas de autos disponible 24/7.
${customInstructions || ''}

Tienes acceso a este inventario:
${vehicleList || 'No hay vehículos disponibles'}

Responde de manera amigable, profesional y útil. Si el cliente pregunta por un vehículo específico, proporciona información relevante.
Si no tienes suficiente información, pregunta amablemente.`;
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-10), // Últimas 10 interacciones
            { role: 'user', content: message },
        ];
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages,
            temperature: 0.7,
            max_tokens: 300,
        });
        const response = completion.choices[0]?.message?.content || '';
        const confidence = response.length > 50 ? 0.8 : 0.5;
        return {
            response,
            confidence,
        };
    }
    catch (error) {
        console.error('Error processing chatbot message:', error);
        return null;
    }
}
/**
 * Detecta idioma y responde en el mismo idioma
 */
async function detectAndRespondInLanguage(tenantId, message, apiKey) {
    try {
        const openai = new openai_1.default({ apiKey });
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Detecta el idioma del mensaje y responde en el mismo idioma. Responde en formato JSON con detectedLanguage y response.',
                },
                { role: 'user', content: message },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            detectedLanguage: result.detectedLanguage || 'es',
            response: result.response || '',
        };
    }
    catch (error) {
        console.error('Error detecting language:', error);
        return null;
    }
}
//# sourceMappingURL=chatbot.js.map
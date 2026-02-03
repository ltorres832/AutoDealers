"use strict";
// Clasificación de leads con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIClassifier = void 0;
const openai_1 = __importDefault(require("openai"));
class AIClassifier {
    constructor(apiKey) {
        this.openai = new openai_1.default({ apiKey });
    }
    /**
     * Clasifica un lead basado en su información e interacciones
     */
    async classifyLead(leadInfo) {
        try {
            const prompt = `Analiza este lead de venta de autos y clasifícalo:

Información:
- Nombre: ${leadInfo.name}
- Fuente: ${leadInfo.source}
- Vehículos de interés: ${leadInfo.interestedVehicles?.join(', ') || 'Ninguno'}
- Mensajes: ${leadInfo.messages?.join('\n') || 'Ninguno'}

Proporciona:
1. Prioridad (high/medium/low)
2. Sentimiento (positive/neutral/negative)
3. Intención de compra (breve descripción)
4. Nivel de confianza (0-1)
5. Razonamiento (opcional)

Responde en formato JSON:`;
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un experto en análisis de leads de venta de autos.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' },
            });
            const content = completion.choices[0]?.message?.content || '{}';
            const result = JSON.parse(content);
            return {
                priority: (result.priority || 'medium'),
                sentiment: (result.sentiment || 'neutral'),
                intent: result.intent || 'No especificado',
                confidence: result.confidence || 0.5,
                reasoning: result.reasoning,
            };
        }
        catch (error) {
            console.error('Error classifying lead:', error);
            // Valores por defecto en caso de error
            return {
                priority: 'medium',
                sentiment: 'neutral',
                intent: 'No clasificado',
                confidence: 0.5,
            };
        }
    }
    /**
     * Analiza el sentimiento de un mensaje
     */
    async analyzeSentiment(message) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'Analiza el sentimiento de este mensaje y responde solo con: positive, neutral o negative',
                    },
                    { role: 'user', content: message },
                ],
                temperature: 0.2,
                max_tokens: 10,
            });
            const result = completion.choices[0]?.message?.content?.toLowerCase() || 'neutral';
            return result.includes('positive')
                ? 'positive'
                : result.includes('negative')
                    ? 'negative'
                    : 'neutral';
        }
        catch (error) {
            console.error('Error analyzing sentiment:', error);
            return 'neutral';
        }
    }
}
exports.AIClassifier = AIClassifier;
//# sourceMappingURL=classification.js.map
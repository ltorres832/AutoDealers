"use strict";
// Generación de contenido con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIContentGenerator = void 0;
const openai_1 = __importDefault(require("openai"));
class AIContentGenerator {
    constructor(apiKey) {
        this.openai = new openai_1.default({ apiKey });
    }
    /**
     * Genera contenido para posts en redes sociales
     */
    async generatePostContent(vehicleInfo, platform) {
        try {
            const platformPrompts = {
                facebook: 'Genera un post profesional para Facebook sobre este vehículo.',
                instagram: 'Genera un post atractivo para Instagram con emojis y hashtags relevantes.',
                tiktok: 'Genera un texto corto y llamativo para TikTok sobre este vehículo.',
            };
            const prompt = `${platformPrompts[platform]}

Vehículo:
- ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}
- Precio: $${vehicleInfo.price.toLocaleString()}
- Características: ${vehicleInfo.keyFeatures?.join(', ') || 'N/A'}

Genera:
1. Contenido del post (${platform === 'tiktok' ? 'muy corto' : 'medio'})
2. Hashtags relevantes (5-10)
3. Sugerencia de mejor horario para publicar (opcional)`;
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un experto en marketing de autos para redes sociales.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.8,
                max_tokens: 300,
            });
            const content = completion.choices[0]?.message?.content || '';
            // Extraer hashtags (simplificado)
            const hashtagMatches = content.match(/#\w+/g) || [];
            const hashtags = hashtagMatches.map((h) => h.substring(1));
            return {
                content: content.replace(/#\w+/g, '').trim(),
                hashtags,
            };
        }
        catch (error) {
            console.error('Error generating post content:', error);
            throw error;
        }
    }
    /**
     * Genera un email personalizado
     */
    async generateEmail(request, context) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: `Genera un ${request.type} ${request.tone || 'professional'} de longitud ${request.length || 'medium'}.`,
                    },
                    { role: 'user', content: `Contexto: ${context}\n${request.context}` },
                ],
                temperature: 0.7,
                max_tokens: request.length === 'short' ? 100 : request.length === 'long' ? 500 : 250,
            });
            return completion.choices[0]?.message?.content || '';
        }
        catch (error) {
            console.error('Error generating email:', error);
            throw error;
        }
    }
    /**
     * Sugiere horarios óptimos para publicar
     */
    async suggestOptimalPostingTimes(platform, targetAudience) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un experto en marketing en redes sociales. Sugiere horarios óptimos para publicar.',
                    },
                    {
                        role: 'user',
                        content: `Plataforma: ${platform}\nAudiencia objetivo: ${targetAudience || 'General'}\nSugiere 3-5 horarios en formato HH:MM`,
                    },
                ],
                temperature: 0.5,
                max_tokens: 100,
            });
            const content = completion.choices[0]?.message?.content || '';
            return content.split('\n').filter((line) => line.trim().length > 0);
        }
        catch (error) {
            console.error('Error suggesting posting times:', error);
            return [];
        }
    }
}
exports.AIContentGenerator = AIContentGenerator;
//# sourceMappingURL=content.js.map
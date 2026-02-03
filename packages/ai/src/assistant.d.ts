import { AIResponse } from './types';
export declare class AIAssistant {
    private openai;
    constructor(apiKey: string);
    /**
     * Genera una respuesta automática para un mensaje
     */
    generateResponse(context: string, message: string, leadHistory?: string[]): Promise<AIResponse>;
    /**
     * Calcula la confianza de una respuesta
     */
    private calculateConfidence;
    /**
     * Sugiere seguimientos automáticos
     */
    suggestFollowUp(leadStatus: string, lastInteraction: string): Promise<string[]>;
}
//# sourceMappingURL=assistant.d.ts.map
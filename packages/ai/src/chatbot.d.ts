/**
 * Procesa mensaje del chatbot y genera respuesta
 */
export declare function processChatbotMessage(tenantId: string, message: string, conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
}>, apiKey: string, customInstructions?: string): Promise<{
    response: string;
    confidence: number;
    suggestedActions?: Array<{
        action: string;
        description: string;
    }>;
} | null>;
/**
 * Detecta idioma y responde en el mismo idioma
 */
export declare function detectAndRespondInLanguage(tenantId: string, message: string, apiKey: string): Promise<{
    detectedLanguage: string;
    response: string;
} | null>;
//# sourceMappingURL=chatbot.d.ts.map
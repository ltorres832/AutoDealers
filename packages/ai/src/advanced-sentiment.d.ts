/**
 * Detecta emociones en conversaciones
 */
export declare function detectEmotions(tenantId: string, leadId: string, apiKey: string): Promise<{
    emotions: Array<{
        emotion: 'happy' | 'excited' | 'neutral' | 'frustrated' | 'angry' | 'sad' | 'interested' | 'hesitant';
        intensity: number;
        context: string;
    }>;
    overallEmotion: string;
    recommendations: string[];
} | null>;
/**
 * Detecta alertas tempranas de clientes insatisfechos
 */
export declare function detectDissatisfactionAlerts(tenantId: string, leadId: string, apiKey: string): Promise<{
    alertLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    indicators: string[];
    recommendedActions: string[];
    urgency: number;
} | null>;
/**
 * Analiza tono y lenguaje
 */
export declare function analyzeToneAndLanguage(tenantId: string, leadId: string, apiKey: string): Promise<{
    tone: 'formal' | 'casual' | 'professional' | 'friendly' | 'aggressive' | 'passive';
    languageStyle: string;
    communicationPreferences: string[];
    recommendations: string[];
} | null>;
/**
 * Predice abandono de leads
 */
export declare function predictLeadAbandonment(tenantId: string, leadId: string, apiKey: string): Promise<{
    abandonmentProbability: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    retentionActions: string[];
} | null>;
//# sourceMappingURL=advanced-sentiment.d.ts.map
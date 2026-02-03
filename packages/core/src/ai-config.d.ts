export interface AIConfig {
    enabled: boolean;
    provider: 'openai' | 'anthropic' | 'none';
    apiKey?: string;
    model?: string;
    autoClassifyLeads: boolean;
    autoRespondMessages: boolean;
    autoSuggestFollowUps: boolean;
    autoGenerateContent: boolean;
    classificationSettings: {
        enabled: boolean;
        model?: string;
        temperature?: number;
        customPrompt?: string;
    };
    responseSettings: {
        enabled: boolean;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        customSystemPrompt?: string;
        requireApproval?: boolean;
        minConfidence?: number;
    };
    contentSettings: {
        enabled: boolean;
        model?: string;
        temperature?: number;
        style?: string;
    };
    advancedSettings: {
        sentimentAnalysis: boolean;
        intentDetection: boolean;
        leadScoring: boolean;
        conversationSummarization: boolean;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
/**
 * Obtiene la configuración de IA de un tenant
 */
export declare function getAIConfig(tenantId: string): Promise<AIConfig>;
/**
 * Actualiza la configuración de IA de un tenant
 */
export declare function updateAIConfig(tenantId: string, updates: Partial<AIConfig>): Promise<void>;
/**
 * Obtiene la API key de IA de un tenant (desencriptada)
 */
export declare function getAIApiKey(tenantId: string): Promise<string | null>;
/**
 * Verifica si la IA está habilitada para un tenant
 */
export declare function isAIEnabled(tenantId: string): Promise<boolean>;
/**
 * Obtiene el modelo de IA configurado para un tenant
 */
export declare function getAIModel(tenantId: string, type?: 'classification' | 'response' | 'content'): Promise<string>;
//# sourceMappingURL=ai-config.d.ts.map
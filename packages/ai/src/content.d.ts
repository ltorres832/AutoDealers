import { ContentGenerationRequest } from './types';
export declare class AIContentGenerator {
    private openai;
    constructor(apiKey: string);
    /**
     * Genera contenido para posts en redes sociales
     */
    generatePostContent(vehicleInfo: {
        make: string;
        model: string;
        year: number;
        price: number;
        keyFeatures?: string[];
    }, platform: 'facebook' | 'instagram' | 'tiktok'): Promise<{
        content: string;
        hashtags: string[];
        suggestedTime?: string;
    }>;
    /**
     * Genera un email personalizado
     */
    generateEmail(request: ContentGenerationRequest, context: string): Promise<string>;
    /**
     * Sugiere horarios óptimos para publicar
     */
    suggestOptimalPostingTimes(platform: 'facebook' | 'instagram' | 'tiktok', targetAudience?: string): Promise<string[]>;
}
//# sourceMappingURL=content.d.ts.map
import { LeadClassification, AISentiment } from './types';
export declare class AIClassifier {
    private openai;
    constructor(apiKey: string);
    /**
     * Clasifica un lead basado en su información e interacciones
     */
    classifyLead(leadInfo: {
        name: string;
        phone: string;
        source: string;
        messages?: string[];
        interestedVehicles?: string[];
    }): Promise<LeadClassification>;
    /**
     * Analiza el sentimiento de un mensaje
     */
    analyzeSentiment(message: string): Promise<AISentiment>;
}
//# sourceMappingURL=classification.d.ts.map
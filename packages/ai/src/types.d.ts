export type AIPriority = 'high' | 'medium' | 'low';
export type AISentiment = 'positive' | 'neutral' | 'negative';
export interface LeadClassification {
    priority: AIPriority;
    sentiment: AISentiment;
    intent: string;
    confidence: number;
    reasoning?: string;
}
export interface AIResponse {
    content: string;
    confidence: number;
    requiresApproval: boolean;
}
export interface ContentGenerationRequest {
    type: 'post' | 'email' | 'message';
    context: string;
    tone?: 'professional' | 'friendly' | 'casual';
    length?: 'short' | 'medium' | 'long';
    language?: string;
}
//# sourceMappingURL=types.d.ts.map
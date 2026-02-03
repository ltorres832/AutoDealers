export interface VehicleData {
    id: string;
    make: string;
    model: string;
    year: number;
    price: number;
    mileage?: number;
    condition: 'new' | 'used' | 'certified';
    location?: string;
    features?: string[];
    images?: string[];
}
export interface CustomerProfile {
    type?: 'budget' | 'premium' | 'family' | 'sport' | 'luxury';
    preferences?: string[];
}
export interface AIGeneratedPost {
    text: string;
    hashtags: string[];
    cta: string;
    suggestedImage?: string;
    optimizedFor: {
        facebook: {
            text: string;
            hashtags: string[];
        };
        instagram: {
            text: string;
            hashtags: string[];
            caption: string;
        };
    };
}
/**
 * Genera contenido de post usando IA basado en vehículo y perfil de cliente
 */
export declare function generateSocialPost(vehicle: VehicleData, customerProfile?: CustomerProfile, objective?: 'more_messages' | 'more_visits'): Promise<AIGeneratedPost>;
/**
 * Analiza vehículo y genera sugerencias de contenido
 */
export declare function analyzeVehicleForSocial(vehicle: VehicleData): Promise<{
    bestTimeToPost: string[];
    suggestedFormats: string[];
    targetAudience: string[];
}>;
//# sourceMappingURL=social-ai.d.ts.map
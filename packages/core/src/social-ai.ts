import type { MarketingVehicle } from '@autodealers/shared/vehicle-marketing';

export interface VehicleData extends MarketingVehicle {
  id: string; make: string; model: string; year: number; price: number;
  condition: 'new' | 'used' | 'certified'; images?: string[];
}
export interface CustomerProfile { type?: 'budget' | 'premium' | 'family' | 'sport' | 'luxury'; preferences?: string[]; }
export interface AIGeneratedPost {
  text: string; hashtags: string[]; cta: string; suggestedImage?: string;
  generationMode: 'ai' | 'facts'; notice?: string;
  optimizedFor: { facebook: { text: string; hashtags: string[] }; instagram: { text: string; hashtags: string[]; caption: string } };
}

export async function generateSocialPost(vehicle: VehicleData, customerProfile?: CustomerProfile, objective: 'more_messages' | 'more_visits' = 'more_messages', tenantId?: string): Promise<AIGeneratedPost> {
  const text = typeof vehicle.masterDescription === 'string' ? vehicle.masterDescription : vehicle.description || '';
  return {text,hashtags:[],cta:'',generationMode:'facts',notice:'Se utiliza la descripción maestra guardada. Para cambiarla, edita el vehículo.',optimizedFor:{facebook:{text,hashtags:[]},instagram:{text,hashtags:[],caption:text}}};
}

export async function analyzeVehicleForSocial(
  vehicle: VehicleData
): Promise<{
  bestTimeToPost: string[];
  suggestedFormats: string[];
  targetAudience: string[];
}> {
  // Análisis básico basado en características del vehículo
  const isPremium = vehicle.price > 500000;
  const isBudget = vehicle.price < 200000;
  const isFamily = vehicle.model.toLowerCase().includes('suv') || 
                   vehicle.model.toLowerCase().includes('van');

  return {
    bestTimeToPost: ['09:00', '12:00', '18:00', '20:00'],
    suggestedFormats: isPremium 
      ? ['single_image', 'carousel', 'video']
      : ['single_image', 'carousel'],
    targetAudience: isPremium
      ? ['luxury_buyers', 'professionals']
      : isBudget
      ? ['first_time_buyers', 'students']
      : isFamily
      ? ['families', 'parents']
      : ['general'],
  };
}


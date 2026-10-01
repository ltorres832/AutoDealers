// Generación de contenido con IA

import OpenAI from 'openai';
import { type MarketingVehicle } from '@autodealers/shared/vehicle-marketing';
import { ContentGenerationRequest } from './types';

export class AIContentGenerator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Genera contenido para posts en redes sociales
   */
  async generatePostContent(
    vehicleInfo: MarketingVehicle,
    platform: 'facebook' | 'instagram' | 'tiktok'
  ): Promise<{
    content: string;
    hashtags: string[];
    suggestedTime?: string;
  }> {
    return {content: typeof vehicleInfo.masterDescription === 'string' ? vehicleInfo.masterDescription : vehicleInfo.description || '', hashtags: []};
  }

  /**
   * Genera un email personalizado
   */
  async generateEmail(
    request: ContentGenerationRequest,
    context: string
  ): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
    } catch (error) {
      console.error('Error generating email:', error);
      throw error;
    }
  }

  /**
   * Sugiere horarios óptimos para publicar
   */
  async suggestOptimalPostingTimes(
    platform: 'facebook' | 'instagram' | 'tiktok',
    targetAudience?: string
  ): Promise<string[]> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
    } catch (error) {
      console.error('Error suggesting posting times:', error);
      return [];
    }
  }
}






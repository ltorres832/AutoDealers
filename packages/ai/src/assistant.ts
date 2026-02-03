// Asistente de IA para respuestas automáticas

import OpenAI from 'openai';
import { AIResponse } from './types';

export class AIAssistant {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Genera una respuesta automática para un mensaje
   */
  async generateResponse(
    context: string,
    message: string,
    leadHistory?: string[]
  ): Promise<AIResponse> {
    try {
      const systemPrompt = `Eres un asistente de ventas de autos. 
Genera respuestas profesionales, amigables y orientadas a ayudar al cliente.
Mantén las respuestas concisas pero informativas.
Si el cliente pregunta por un vehículo específico, proporciona información relevante.
Si no tienes suficiente información, pregunta amablemente.`;

      const userPrompt = `Contexto: ${context}
Historial: ${leadHistory?.join('\n') || 'Ninguno'}
Mensaje del cliente: ${message}

Genera una respuesta apropiada:`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const content = completion.choices[0]?.message?.content || '';
      const confidence = this.calculateConfidence(content);

      return {
        content,
        confidence,
        requiresApproval: confidence < 0.7,
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  /**
   * Calcula la confianza de una respuesta
   */
  private calculateConfidence(content: string): number {
    // Lógica simple: más largo y con información específica = mayor confianza
    const lengthScore = Math.min(content.length / 100, 1);
    const hasSpecificInfo = /(\d+|precio|modelo|año|marca)/i.test(content);
    return Math.min(lengthScore * 0.7 + (hasSpecificInfo ? 0.3 : 0), 1);
  }

  /**
   * Sugiere seguimientos automáticos
   */
  async suggestFollowUp(
    leadStatus: string,
    lastInteraction: string
  ): Promise<string[]> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Genera 3 sugerencias de seguimiento para un lead de venta de autos.',
          },
          {
            role: 'user',
            content: `Estado del lead: ${leadStatus}\nÚltima interacción: ${lastInteraction}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const content = completion.choices[0]?.message?.content || '';
      return content.split('\n').filter((line) => line.trim().length > 0);
    } catch (error) {
      console.error('Error suggesting follow-up:', error);
      return [];
    }
  }
}






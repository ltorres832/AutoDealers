// Chatbot avanzado con IA

import { getFirestore } from '@autodealers/core';
import { getVehicles } from '@autodealers/inventory';
import OpenAI from 'openai';

const db = getFirestore();

/**
 * Procesa mensaje del chatbot y genera respuesta
 */
export async function processChatbotMessage(
  tenantId: string,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
  customInstructions?: string
): Promise<{
  response: string;
  confidence: number;
  suggestedActions?: Array<{
    action: string;
    description: string;
  }>;
} | null> {
  try {
    const vehicles = await getVehicles(tenantId, { status: 'available' });
    const vehicleList = vehicles.slice(0, 20).map(v => 
      `${v.year} ${v.make} ${v.model} - $${v.price}`
    ).join('\n');

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Eres un asistente virtual de ventas de autos disponible 24/7.
${customInstructions || ''}

Tienes acceso a este inventario:
${vehicleList || 'No hay vehículos disponibles'}

Responde de manera amigable, profesional y útil. Si el cliente pregunta por un vehículo específico, proporciona información relevante.
Si no tienes suficiente información, pregunta amablemente.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-10), // Últimas 10 interacciones
      { role: 'user' as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content || '';
    const confidence = response.length > 50 ? 0.8 : 0.5;

    return {
      response,
      confidence,
    };
  } catch (error) {
    console.error('Error processing chatbot message:', error);
    return null;
  }
}

/**
 * Detecta idioma y responde en el mismo idioma
 */
export async function detectAndRespondInLanguage(
  tenantId: string,
  message: string,
  apiKey: string
): Promise<{
  detectedLanguage: string;
  response: string;
} | null> {
  try {
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Detecta el idioma del mensaje y responde en el mismo idioma. Responde en formato JSON con detectedLanguage y response.',
        },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);

    return {
      detectedLanguage: result.detectedLanguage || 'es',
      response: result.response || '',
    };
  } catch (error) {
    console.error('Error detecting language:', error);
    return null;
  }
}




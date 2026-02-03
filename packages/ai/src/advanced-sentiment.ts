// Análisis de sentimiento avanzado con IA

import { getFirestore } from '@autodealers/core';
import OpenAI from 'openai';

const db = getFirestore();

/**
 * Detecta emociones en conversaciones
 */
export async function detectEmotions(
  tenantId: string,
  leadId: string,
  apiKey: string
): Promise<{
  emotions: Array<{
    emotion: 'happy' | 'excited' | 'neutral' | 'frustrated' | 'angry' | 'sad' | 'interested' | 'hesitant';
    intensity: number; // 0-100
    context: string;
  }>;
  overallEmotion: string;
  recommendations: string[];
} | null> {
  try {
    const leadDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .doc(leadId)
      .get();

    if (!leadDoc.exists) {
      return null;
    }

    const leadData = leadDoc.data();
    const interactions = leadData?.interactions || [];

    const openai = new OpenAI({ apiKey });

    const prompt = `Analiza las emociones en esta conversación:

Interacciones:
${interactions.map((i: any) => 
  `${i.type === 'inbound' ? 'Cliente' : 'Vendedor'}: ${i.content}`
).join('\n')}

Detecta:
1. Emociones específicas en cada interacción
2. Intensidad de cada emoción (0-100)
3. Contexto de cada emoción
4. Emoción general del cliente
5. Recomendaciones para manejar la situación

Responde en formato JSON:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en análisis de emociones y psicología del cliente.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);

    return {
      emotions: result.emotions || [],
      overallEmotion: result.overallEmotion || 'neutral',
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error('Error detecting emotions:', error);
    return null;
  }
}

/**
 * Detecta alertas tempranas de clientes insatisfechos
 */
export async function detectDissatisfactionAlerts(
  tenantId: string,
  leadId: string,
  apiKey: string
): Promise<{
  alertLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  recommendedActions: string[];
  urgency: number; // 0-100
} | null> {
  try {
    const leadDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .doc(leadId)
      .get();

    if (!leadDoc.exists) {
      return null;
    }

    const leadData = leadDoc.data();
    const interactions = leadData?.interactions || [];

    const openai = new OpenAI({ apiKey });

    const prompt = `Detecta señales de insatisfacción del cliente:

Lead:
- Estado: ${leadData?.status}
- Última interacción: ${interactions[interactions.length - 1]?.content || 'Ninguna'}

Todas las interacciones:
${interactions.map((i: any) => 
  `${i.type === 'inbound' ? 'Cliente' : 'Vendedor'}: ${i.content}`
).join('\n')}

Analiza:
1. Nivel de alerta (none/low/medium/high/critical)
2. Indicadores de insatisfacción
3. Acciones recomendadas para recuperar al cliente
4. Urgencia (0-100)

Responde en formato JSON:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en detección de insatisfacción del cliente y recuperación.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);

    return {
      alertLevel: result.alertLevel || 'none',
      indicators: result.indicators || [],
      recommendedActions: result.recommendedActions || [],
      urgency: result.urgency || 0,
    };
  } catch (error) {
    console.error('Error detecting dissatisfaction alerts:', error);
    return null;
  }
}

/**
 * Analiza tono y lenguaje
 */
export async function analyzeToneAndLanguage(
  tenantId: string,
  leadId: string,
  apiKey: string
): Promise<{
  tone: 'formal' | 'casual' | 'professional' | 'friendly' | 'aggressive' | 'passive';
  languageStyle: string;
  communicationPreferences: string[];
  recommendations: string[];
} | null> {
  try {
    const leadDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .doc(leadId)
      .get();

    if (!leadDoc.exists) {
      return null;
    }

    const leadData = leadDoc.data();
    const interactions = leadData?.interactions || [];

    const openai = new OpenAI({ apiKey });

    const prompt = `Analiza el tono y lenguaje del cliente:

Interacciones del cliente:
${interactions.filter((i: any) => i.type === 'inbound').map((i: any) => i.content).join('\n')}

Analiza:
1. Tono de comunicación (formal/casual/professional/friendly/aggressive/passive)
2. Estilo de lenguaje
3. Preferencias de comunicación
4. Recomendaciones para adaptar el estilo de respuesta

Responde en formato JSON:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en análisis de comunicación y estilo de lenguaje.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);

    return {
      tone: result.tone || 'neutral',
      languageStyle: result.languageStyle || '',
      communicationPreferences: result.communicationPreferences || [],
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error('Error analyzing tone and language:', error);
    return null;
  }
}

/**
 * Predice abandono de leads
 */
export async function predictLeadAbandonment(
  tenantId: string,
  leadId: string,
  apiKey: string
): Promise<{
  abandonmentProbability: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  retentionActions: string[];
} | null> {
  try {
    const leadDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .doc(leadId)
      .get();

    if (!leadDoc.exists) {
      return null;
    }

    const leadData = leadDoc.data();
    const interactions = leadData?.interactions || [];
    const lastInteraction = interactions[interactions.length - 1];
    const daysSinceLastInteraction = lastInteraction 
      ? Math.floor((Date.now() - (lastInteraction.createdAt instanceof Date 
        ? lastInteraction.createdAt.getTime() 
        : new Date(lastInteraction.createdAt).getTime())) / (1000 * 60 * 60 * 24))
      : 999;

    const openai = new OpenAI({ apiKey });

    const prompt = `Predice la probabilidad de abandono de este lead:

Lead:
- Estado: ${leadData?.status}
- Días desde última interacción: ${daysSinceLastInteraction}
- Total de interacciones: ${interactions.length}
- Última interacción: ${lastInteraction?.content || 'Ninguna'}

Historial completo:
${interactions.map((i: any) => 
  `${i.type}: ${i.content}`
).join('\n')}

Predice:
1. Probabilidad de abandono (0-100)
2. Nivel de riesgo (low/medium/high/critical)
3. Factores que contribuyen al riesgo
4. Acciones de retención recomendadas

Responde en formato JSON:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en predicción de abandono de leads y retención.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);

    const abandonmentProbability = result.abandonmentProbability || 0;
    const riskLevel = abandonmentProbability >= 70 ? 'critical' :
                     abandonmentProbability >= 50 ? 'high' :
                     abandonmentProbability >= 30 ? 'medium' : 'low';

    return {
      abandonmentProbability,
      riskLevel,
      factors: result.factors || [],
      retentionActions: result.retentionActions || [],
    };
  } catch (error) {
    console.error('Error predicting lead abandonment:', error);
    return null;
  }
}




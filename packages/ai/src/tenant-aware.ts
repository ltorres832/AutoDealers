// Servicios de IA con soporte multi-tenant y configuración personalizada

import { AIClassifier } from './classification';
import { AIAssistant } from './assistant';
import { AIContentGenerator } from './content';
import { getAIConfig, getAIApiKey, isAIEnabled, getAIModel } from '@autodealers/core';
import { LeadClassification, AIResponse } from './types';

/**
 * Clasifica un lead usando la configuración del tenant
 */
export async function classifyLeadWithTenantConfig(
  tenantId: string,
  leadInfo: {
    name: string;
    phone: string;
    source: string;
    messages?: string[];
    interestedVehicles?: string[];
  }
): Promise<LeadClassification | null> {
  try {
    // Verificar si la IA está habilitada
    if (!(await isAIEnabled(tenantId))) {
      return null;
    }

    const config = await getAIConfig(tenantId);
    
    // Verificar si la clasificación automática está habilitada
    if (!config.autoClassifyLeads || !config.classificationSettings.enabled) {
      return null;
    }

    const apiKey = await getAIApiKey(tenantId);
    if (!apiKey) {
      return null;
    }

    const classifier = new AIClassifier(apiKey);
    
    // Usar prompt personalizado si existe
    if (config.classificationSettings.customPrompt) {
      // TODO: Implementar uso de prompt personalizado
    }

    const classification = await classifier.classifyLead(leadInfo);
    return classification;
  } catch (error) {
    console.error('Error clasificando lead con configuración de tenant:', error);
    return null;
  }
}

/**
 * Genera una respuesta automática usando la configuración del tenant y el perfil expandido del negocio
 */
export async function generateResponseWithTenantConfig(
  tenantId: string,
  context: string,
  message: string,
  leadHistory?: string[]
): Promise<AIResponse | null> {
  try {
    if (!(await isAIEnabled(tenantId))) {
      return null;
    }

    const config = await getAIConfig(tenantId);
    
    // Verificar configuración de respuestas automáticas desde el dashboard
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const aiConfigDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('settings')
      .doc('ai_config')
      .get();
    
    const aiDashboardConfig = aiConfigDoc.exists ? aiConfigDoc.data() : null;
    
    // Verificar si las respuestas automáticas están habilitadas
    if (!aiDashboardConfig?.enabled || !aiDashboardConfig?.autoResponses?.enabled) {
      return null;
    }

    const apiKey = await getAIApiKey(tenantId);
    if (!apiKey) {
      return null;
    }

    // Obtener perfil expandido del negocio
    const profileQuestions = aiDashboardConfig?.profileQuestions || {};
    
    // Construir system prompt usando el perfil expandido
    let systemPrompt = `Eres un asistente de ventas de autos profesional trabajando para ${profileQuestions.businessName || 'un concesionario'}. `;
    
    if (profileQuestions.businessType) {
      systemPrompt += `Tipo de negocio: ${profileQuestions.businessType}. `;
    }
    
    if (profileQuestions.location) {
      systemPrompt += `Ubicación: ${profileQuestions.location}. `;
    }
    
    if (profileQuestions.specialties) {
      systemPrompt += `Especialidades: ${profileQuestions.specialties}. `;
    }
    
    if (profileQuestions.uniqueSellingPoints) {
      systemPrompt += `Puntos únicos de venta: ${profileQuestions.uniqueSellingPoints}. `;
    }
    
    if (profileQuestions.pricingStrategy) {
      systemPrompt += `Estrategia de precios: ${profileQuestions.pricingStrategy}. `;
    }
    
    if (profileQuestions.paymentOptions) {
      systemPrompt += `Métodos de pago aceptados: ${profileQuestions.paymentOptions}. `;
    }
    
    if (profileQuestions.financingOptions) {
      systemPrompt += `Opciones de financiamiento: ${profileQuestions.financingOptions}. `;
    }
    
    if (profileQuestions.warrantyInfo) {
      systemPrompt += `Información de garantías: ${profileQuestions.warrantyInfo}. `;
    }
    
    if (profileQuestions.tradeInPolicy) {
      systemPrompt += `Política de cambio: ${profileQuestions.tradeInPolicy}. `;
    }
    
    if (profileQuestions.deliveryOptions) {
      systemPrompt += `Opciones de entrega: ${profileQuestions.deliveryOptions}. `;
    }
    
    if (profileQuestions.businessHours) {
      systemPrompt += `Horarios de atención: ${profileQuestions.businessHours}. `;
    }
    
    if (profileQuestions.responseStyle) {
      systemPrompt += `Estilo de respuesta preferido: ${profileQuestions.responseStyle}. `;
    }
    
    if (profileQuestions.commonQuestions) {
      systemPrompt += `Preguntas frecuentes y respuestas: ${profileQuestions.commonQuestions}. `;
    }
    
    if (profileQuestions.dealBreakers) {
      systemPrompt += `IMPORTANTE - Políticas estrictas (NUNCA hacer esto): ${profileQuestions.dealBreakers}. `;
    }
    
    if (profileQuestions.successStories) {
      systemPrompt += `Historias de éxito para mencionar: ${profileQuestions.successStories}. `;
    }
    
    if (profileQuestions.specialInstructions) {
      systemPrompt += `INSTRUCCIONES ESPECIALES: ${profileQuestions.specialInstructions}. `;
    }
    
    // Agregar reglas de automatización
    if (profileQuestions.autoResponseRules?.whenToRespond) {
      systemPrompt += `Reglas de respuesta automática: ${profileQuestions.autoResponseRules.whenToRespond}. `;
    }
    
    if (profileQuestions.autoResponseRules?.whenToEscalate) {
      systemPrompt += `Cuándo escalar a humano: ${profileQuestions.autoResponseRules.whenToEscalate}. `;
    }
    
    systemPrompt += `Genera respuestas amigables, informativas y orientadas a ayudar al cliente. Mantén las respuestas concisas pero completas. `;
    
    if (profileQuestions.tone) {
      systemPrompt += `Usa un tono ${profileQuestions.tone}. `;
    }
    
    if (profileQuestions.language) {
      systemPrompt += `Responde en ${profileQuestions.language === 'es' ? 'español' : profileQuestions.language === 'en' ? 'inglés' : 'portugués'}. `;
    }

    // Usar OpenAI directamente con el prompt personalizado
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });
    
    const completion = await openai.chat.completions.create({
      model: config.responseSettings.model || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Contexto: ${context}\nHistorial: ${leadHistory?.join('\n') || 'Ninguno'}\nMensaje del cliente: ${message}\n\nGenera una respuesta apropiada:` 
        },
      ],
      temperature: config.responseSettings.temperature || 0.7,
      max_tokens: config.responseSettings.maxTokens || 200,
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Calcular confianza
    const lengthScore = Math.min(content.length / 100, 1);
    const hasSpecificInfo = /(\d+|precio|modelo|año|marca|disponible|financiamiento|garantía)/i.test(content);
    const confidence = Math.min(lengthScore * 0.7 + (hasSpecificInfo ? 0.3 : 0), 1);

    const response: AIResponse = {
      content,
      confidence,
      requiresApproval: false,
    };

    // Verificar confianza mínima
    const minConfidence = aiDashboardConfig?.autoResponses?.requireApproval 
      ? (config.responseSettings.minConfidence || 0.7)
      : 0.5;
    
    if (confidence < minConfidence) {
      response.requiresApproval = true;
    }

    // Verificar si requiere aprobación según configuración
    if (aiDashboardConfig?.autoResponses?.requireApproval && response.requiresApproval) {
      return response;
    }

    return response;
  } catch (error) {
    console.error('Error generando respuesta con configuración de tenant:', error);
    return null;
  }
}

/**
 * Analiza el sentimiento de un mensaje usando la configuración del tenant
 */
export async function analyzeSentimentWithTenantConfig(
  tenantId: string,
  message: string
): Promise<'positive' | 'neutral' | 'negative' | null> {
  try {
    if (!(await isAIEnabled(tenantId))) {
      return null;
    }

    const config = await getAIConfig(tenantId);
    
    if (!config.advancedSettings.sentimentAnalysis) {
      return null;
    }

    const apiKey = await getAIApiKey(tenantId);
    if (!apiKey) {
      return null;
    }

    const classifier = new AIClassifier(apiKey);
    return await classifier.analyzeSentiment(message);
  } catch (error) {
    console.error('Error analizando sentimiento con configuración de tenant:', error);
    return null;
  }
}

/**
 * Sugiere seguimientos usando la configuración del tenant
 */
export async function suggestFollowUpsWithTenantConfig(
  tenantId: string,
  leadStatus: string,
  lastInteraction: string
): Promise<string[]> {
  try {
    if (!(await isAIEnabled(tenantId))) {
      return [];
    }

    const config = await getAIConfig(tenantId);
    
    if (!config.autoSuggestFollowUps) {
      return [];
    }

    const apiKey = await getAIApiKey(tenantId);
    if (!apiKey) {
      return [];
    }

    const assistant = new AIAssistant(apiKey);
    return await assistant.suggestFollowUp(leadStatus, lastInteraction);
  } catch (error) {
    console.error('Error sugiriendo seguimientos con configuración de tenant:', error);
    return [];
  }
}



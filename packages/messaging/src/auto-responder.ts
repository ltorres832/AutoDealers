// Sistema automático de respuestas con IA

import { MessagePayload, MessageResponse } from './types';
import { UnifiedMessagingService } from './unified';
import { canAutoRespond, getAIConfig } from '@autodealers/core';
import { findAutoResponse } from '@autodealers/core';
import { findFAQ } from '@autodealers/core';
import { AIAssistant } from '@autodealers/ai';
import { createMessage } from '@autodealers/crm';

export class AutoResponder {
  private unifiedService: UnifiedMessagingService;
  private aiAssistant: AIAssistant;

  constructor(unifiedService: UnifiedMessagingService) {
    this.unifiedService = unifiedService;
    this.aiAssistant = new AIAssistant(process.env.OPENAI_API_KEY || '');
  }

  /**
   * Procesa un mensaje entrante y responde automáticamente si está configurado
   */
  async processIncomingMessage(
    tenantId: string,
    message: MessagePayload
  ): Promise<MessageResponse | null> {
    // Verificar si IA está autorizada para responder
    const canRespond = await canAutoRespond(
      tenantId,
      message.channel === 'email' ? 'emails' : 'messages'
    );

    if (!canRespond) {
      return null; // No responder automáticamente
    }

    // Obtener configuración de IA
    const aiConfig = await getAIConfig(tenantId);
    if (!aiConfig) {
      return null;
    }

    // 1. Buscar respuesta automática configurada
    const autoResponse = await findAutoResponse(
      tenantId,
      message.content,
      message.channel
    );

    if (autoResponse) {
      return await this.sendAutoResponse(tenantId, message, autoResponse.response);
    }

    // 2. Buscar FAQ
    const faq = await findFAQ(tenantId, message.content);
    if (faq) {
      return await this.sendAutoResponse(tenantId, message, faq.answer);
    }

    // 3. Generar respuesta con IA
    if (aiConfig.autoRespondMessages || aiConfig.autoRespondEmails) {
      return await this.generateAIResponse(tenantId, message, aiConfig);
    }

    return null;
  }

  /**
   * Envía una respuesta automática
   */
  private async sendAutoResponse(
    tenantId: string,
    originalMessage: MessagePayload,
    responseText: string
  ): Promise<MessageResponse> {
    const responsePayload: MessagePayload = {
      tenantId,
      leadId: originalMessage.leadId,
      channel: originalMessage.channel,
      direction: 'outbound',
      from: originalMessage.to,
      to: originalMessage.from,
      content: responseText,
      metadata: {
        autoResponse: true,
        originalMessageId: originalMessage.leadId,
      },
    };

    return await this.unifiedService.sendMessage(responsePayload);
  }

  /**
   * Genera respuesta con IA
   */
  private async generateAIResponse(
    tenantId: string,
    message: MessagePayload,
    aiConfig: any
  ): Promise<MessageResponse | null> {
    try {
      // Obtener historial del lead si existe
      const leadHistory: string[] = [];
      if (message.leadId) {
        const { getLeadMessages } = await import('@autodealers/crm');
        const messages = await getLeadMessages(tenantId, message.leadId);
        leadHistory.push(
          ...messages
            .slice(-5)
            .map((m) => `${m.direction}: ${m.content}`)
        );
      }

      // Generar respuesta
      const aiResponse = await this.aiAssistant.generateResponse(
        `Eres un asistente de ventas de autos. Responde de manera ${aiConfig.responseTone}.`,
        message.content,
        leadHistory
      );

      // Verificar si requiere aprobación
      if (aiConfig.requireApproval && aiResponse.confidence < aiConfig.confidenceThreshold) {
        // Guardar como pendiente de aprobación
        await this.savePendingResponse(tenantId, message, aiResponse.content);
        return null; // No enviar automáticamente
      }

      // Enviar respuesta
      return await this.sendAutoResponse(tenantId, message, aiResponse.content);
    } catch (error) {
      console.error('Error generating AI response:', error);
      return null;
    }
  }

  /**
   * Guarda respuesta pendiente de aprobación
   */
  private async savePendingResponse(
    tenantId: string,
    originalMessage: MessagePayload,
    responseText: string
  ): Promise<void> {
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();

    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('pending_responses')
      .add({
        originalMessage,
        responseText,
        status: 'pending',
        createdAt: new Date(),
      });
  }
}






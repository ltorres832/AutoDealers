// Pipeline unificado: responde siempre (con o sin IA) según configuración y membresía

import {
  findAutoResponse,
  findFAQ,
  getFirestore,
  tenantCanAutoRespond,
  tenantCanClassifyLeads,
} from '@autodealers/core';
import type { MessageChannel } from './types';

export type InboundResponseSource =
  | 'auto_response'
  | 'faq'
  | 'template'
  | 'ai'
  | 'fallback'
  | 'none';

export interface InboundMessageContext {
  tenantId: string;
  channel: MessageChannel | 'public_chat';
  message: string;
  leadId?: string;
  leadStatus?: string;
  clientName?: string;
  leadHistory?: string[];
  /** Si false, no intenta IA aunque esté configurada */
  allowAI?: boolean;
}

export interface InboundResponseResult {
  content: string | null;
  source: InboundResponseSource;
  requiresApproval?: boolean;
  confidence?: number;
  aiGenerated?: boolean;
}

function channelAllowed(
  configuredChannels: string[] | undefined,
  channel: string
): boolean {
  if (!configuredChannels || configuredChannels.length === 0) return true;
  const normalized = channel === 'public_chat' ? 'messages' : channel;
  return (
    configuredChannels.includes(normalized) ||
    configuredChannels.includes(channel) ||
    configuredChannels.includes('messages')
  );
}

function defaultFallback(clientName?: string): string {
  const name = clientName?.trim();
  if (name) {
    return `Hola ${name}, gracias por contactarnos. Un representante te atenderá pronto.`;
  }
  return 'Gracias por contactarnos. Un representante te atenderá pronto.';
}

async function loadAiDashboardConfig(tenantId: string): Promise<Record<string, any> | null> {
  const db = getFirestore();
  const doc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc('ai_config')
    .get();
  return doc.exists ? (doc.data() as Record<string, any>) : null;
}

async function matchMessageTemplate(
  tenantId: string,
  message: string,
  channel: string
): Promise<string | null> {
  const cfg = await loadAiDashboardConfig(tenantId);
  const templates = cfg?.messageTemplates?.autoResponses;
  if (!Array.isArray(templates)) return null;

  const messageLower = message.toLowerCase();
  for (const tpl of templates) {
    if (tpl?.enabled === false) continue;
    const channels: string[] = Array.isArray(tpl?.channels) ? tpl.channels : [];
    if (channels.length > 0 && !channels.includes(channel) && channel !== 'public_chat') {
      continue;
    }
    const keywords: string[] = Array.isArray(tpl?.keywords) ? tpl.keywords : [];
    if (keywords.length === 0 || keywords.some((k) => messageLower.includes(String(k).toLowerCase()))) {
      if (typeof tpl?.response === 'string' && tpl.response.trim()) {
        return tpl.response.trim();
      }
    }
  }
  return null;
}

/**
 * Resuelve la mejor respuesta automática para un mensaje entrante.
 * Siempre intenta fallback genérico si nada más aplica (allowFallback=true por defecto).
 */
export async function resolveInboundResponse(
  ctx: InboundMessageContext,
  options?: { allowFallback?: boolean }
): Promise<InboundResponseResult> {
  const allowFallback = options?.allowFallback !== false;
  const channel = ctx.channel === 'public_chat' ? 'messages' : ctx.channel;

  // 1. Respuestas automáticas por palabra clave (sin IA)
  try {
    const autoResponse = await findAutoResponse(ctx.tenantId, ctx.message, channel);
    if (autoResponse?.response?.trim()) {
      return {
        content: autoResponse.response.trim(),
        source: 'auto_response',
        aiGenerated: false,
      };
    }
  } catch (error) {
    console.warn('auto_response lookup skipped:', error);
  }

  // 2. FAQs (sin IA)
  try {
    const faq = await findFAQ(ctx.tenantId, ctx.message);
    if (faq?.answer?.trim()) {
      return {
        content: faq.answer.trim(),
        source: 'faq',
        aiGenerated: false,
      };
    }
  } catch (error) {
    console.warn('faq lookup skipped:', error);
  }

  // 3. Plantillas del dashboard de IA
  try {
    const template = await matchMessageTemplate(ctx.tenantId, ctx.message, channel);
    if (template) {
      return {
        content: template,
        source: 'template',
        aiGenerated: false,
      };
    }
  } catch (error) {
    console.warn('template lookup skipped:', error);
  }

  // 4. IA (requiere membresía + configuración del tenant)
  if (ctx.allowAI !== false) {
    try {
      const cfg = await loadAiDashboardConfig(ctx.tenantId);
      const autoResponsesEnabled =
        cfg?.enabled === true && cfg?.autoResponses?.enabled === true;
      const channelOk = channelAllowed(cfg?.autoResponses?.channels, ctx.channel);

      if (autoResponsesEnabled && channelOk) {
        const canAi = await tenantCanAutoRespond(ctx.tenantId);
        if (canAi) {
          const { generateResponseWithTenantConfig } = await import('@autodealers/ai');
          const contextLabel =
            ctx.channel === 'public_chat'
              ? `Chat público - ${ctx.clientName || 'Cliente'}`
              : `Mensaje ${ctx.channel} - ${ctx.clientName || 'Cliente'}`;

          const aiResponse = await generateResponseWithTenantConfig(
            ctx.tenantId,
            contextLabel,
            ctx.message,
            ctx.leadHistory
          );

          if (aiResponse?.content?.trim()) {
            return {
              content: aiResponse.content.trim(),
              source: 'ai',
              requiresApproval: aiResponse.requiresApproval,
              confidence: aiResponse.confidence,
              aiGenerated: true,
            };
          }
        }
      }
    } catch (error) {
      console.warn('AI response skipped:', error);
    }
  }

  if (allowFallback) {
    return {
      content: defaultFallback(ctx.clientName),
      source: 'fallback',
      aiGenerated: false,
    };
  }

  return { content: null, source: 'none' };
}

/**
 * Clasifica un lead si la membresía y configuración lo permiten.
 */
export async function classifyInboundLead(
  tenantId: string,
  leadInfo: {
    name: string;
    phone: string;
    source: string;
    messages?: string[];
    interestedVehicles?: string[];
  }
) {
  try {
    const canClassify = await tenantCanClassifyLeads(tenantId);
    if (!canClassify) return null;

    const { classifyLeadWithTenantConfig } = await import('@autodealers/ai');
    return await classifyLeadWithTenantConfig(tenantId, leadInfo);
  } catch (error) {
    console.warn('Lead classification skipped:', error);
    return null;
  }
}

// Validación en tiempo real de features y límites de voz según la membresía

import type { CallDirection } from './types';

export interface VoiceAccessResult {
  allowed: boolean;
  reason?: string;
  /** Si el consumo excederá el límite y se facturará como overage */
  willBillOverage?: boolean;
}

async function getFeatures(tenantId: string): Promise<Record<string, unknown> | null> {
  try {
    const core = await import('@autodealers/core');
    return await (core as any).getTenantMembershipFeatures(tenantId);
  } catch (error) {
    console.error('[voice] Error leyendo features de membresía:', error);
    return null;
  }
}

/**
 * Verifica si el tenant puede iniciar/recibir una llamada de voz IA.
 * Chequea el feature flag y el límite de llamadas del mes.
 */
export async function canUseVoiceAgent(
  tenantId: string,
  direction: CallDirection
): Promise<VoiceAccessResult> {
  const features = await getFeatures(tenantId);
  if (!features || features.voiceAIEnabled !== true) {
    return {
      allowed: false,
      reason: 'El Agente de Voz IA no está incluido en tu plan. Mejora tu membresía para activarlo.',
    };
  }
  if (direction === 'inbound' && features.voiceInboundEnabled === false) {
    return { allowed: false, reason: 'Las llamadas entrantes con IA no están habilitadas en tu plan.' };
  }
  if (direction === 'outbound' && features.voiceOutboundEnabled === false) {
    return { allowed: false, reason: 'Las llamadas salientes con IA no están habilitadas en tu plan.' };
  }

  try {
    const billing = await import('@autodealers/billing');
    const metric = direction === 'inbound' ? 'voiceInboundCalls' : 'voiceOutboundCalls';
    const check = await (billing as any).assertWithinLimit(tenantId, metric, 1);
    if (!check.allowed) {
      return { allowed: false, reason: check.reason };
    }
    return { allowed: true, willBillOverage: check.willBillOverage };
  } catch (error) {
    console.error('[voice] Error verificando límites de uso:', error);
    // Fail-open en el check de límite (el feature flag ya pasó)
    return { allowed: true };
  }
}

/** Verifica si el tenant puede agendar citas de servicio por voz. */
export async function canUseVoiceServiceCalls(tenantId: string): Promise<boolean> {
  const features = await getFeatures(tenantId);
  return features?.voiceAIEnabled === true && features?.voiceServiceCallsEnabled === true;
}

/**
 * Consume el uso de una llamada terminada: cuenta la llamada y los minutos.
 * Registra overage automáticamente si el plan lo permite.
 */
export async function consumeCallUsage(
  tenantId: string,
  direction: CallDirection,
  billedMinutes: number
): Promise<void> {
  try {
    const billing = await import('@autodealers/billing');
    const callMetric = direction === 'inbound' ? 'voiceInboundCalls' : 'voiceOutboundCalls';
    await (billing as any).consumeUsage(tenantId, callMetric, 1);
    if (billedMinutes > 0) {
      await (billing as any).consumeUsage(tenantId, 'voiceMinutes', billedMinutes);
    }
  } catch (error) {
    console.error('[voice] Error registrando uso de llamada:', error);
  }
}

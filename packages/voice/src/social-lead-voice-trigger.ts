// Detección de leads de redes sociales y disparo de llamada saliente automática

import type { Lead } from '@autodealers/crm';
import { getVoiceConfig, isWithinBusinessHours } from './voice-config';
import { canUseVoiceAgent } from './voice-membership-guard';
import { enqueueOutboundCall } from './outbound-queue';
import type { VoiceOutboundQueueItem } from './types';

export type SocialLeadOrigin = 'meta_lead_ads' | 'whatsapp' | 'messenger' | 'instagram';

function originFromLead(lead: Lead): SocialLeadOrigin | null {
  if (lead.metaLeadGenId) return 'meta_lead_ads';
  switch (lead.source) {
    case 'whatsapp':
      return 'whatsapp';
    case 'facebook':
      return 'messenger';
    case 'instagram':
      return 'instagram';
    default:
      return null;
  }
}

function originEnabled(
  origin: SocialLeadOrigin,
  config: NonNullable<Awaited<ReturnType<typeof getVoiceConfig>>>
): boolean {
  const sac = config.socialAutoCall;
  if (!sac) return false;
  switch (origin) {
    case 'meta_lead_ads':
      return sac.metaLeadAdsEnabled;
    case 'whatsapp':
      return sac.whatsappEnabled;
    case 'messenger':
      return sac.messengerEnabled;
    case 'instagram':
      return sac.instagramEnabled;
  }
}

/**
 * Si el lead viene de redes sociales y el tenant tiene el auto-call activado
 * (y su membresía lo permite), encola una llamada saliente contextual.
 * Llamar tras crear el lead (leadgen ingest, pipeline de mensajes entrantes).
 */
export async function maybeEnqueueSocialLeadCall(
  tenantId: string,
  lead: Lead
): Promise<VoiceOutboundQueueItem | null> {
  try {
    const origin = originFromLead(lead);
    if (!origin) return null;

    const phone = lead.contact?.phone?.trim();
    if (!phone) return null;
    // Debe ser un teléfono real y marcable (FB/IG a veces traen PSIDs en el campo phone)
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length < 10 || digits.length > 15) return null;

    const config = await getVoiceConfig(tenantId);
    if (!config?.enabled || !config.outboundEnabled) return null;
    if (!originEnabled(origin, config)) return null;

    const access = await canUseVoiceAgent(tenantId, 'outbound');
    if (!access.allowed) {
      console.log(`[voice] Auto-call social omitido para ${tenantId}: ${access.reason}`);
      return null;
    }

    const delayMinutes = Math.max(0, config.socialAutoCall.delayMinutes || 0);
    let scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

    if (config.socialAutoCall.onlyBusinessHours && config.businessHours) {
      // Si cae fuera de horario, mover al próximo día hábil a la hora de apertura
      let guard = 0;
      while (!isWithinBusinessHours(config.businessHours, scheduledFor) && guard < 14) {
        const day = String(scheduledFor.getDay());
        const hours = config.businessHours[day];
        if (hours && !hours.closed && hours.open) {
          const [h, m] = hours.open.split(':').map(Number);
          const candidate = new Date(scheduledFor);
          candidate.setHours(h, m || 0, 0, 0);
          if (candidate > scheduledFor) {
            scheduledFor = candidate;
            continue;
          }
        }
        scheduledFor = new Date(scheduledFor.getTime() + 24 * 60 * 60 * 1000);
        const nextDayHours = config.businessHours[String(scheduledFor.getDay())];
        if (nextDayHours && !nextDayHours.closed && nextDayHours.open) {
          const [h, m] = nextDayHours.open.split(':').map(Number);
          scheduledFor.setHours(h, m || 0, 0, 0);
        }
        guard++;
      }
    }

    return await enqueueOutboundCall({
      tenantId,
      leadId: lead.id,
      scenario: 'social_lead_follow_up',
      toNumber: phone,
      scheduledFor,
      context: {
        origin,
        leadSource: lead.source,
        vehicleInterest: lead.vehicleInterest || null,
        metaLeadGenId: lead.metaLeadGenId || null,
      },
    });
  } catch (error) {
    console.error('[voice] Error encolando auto-call social:', error);
    return null;
  }
}

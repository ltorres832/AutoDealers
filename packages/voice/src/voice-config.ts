// Configuración del agente de voz por tenant

import { getFirestore } from '@autodealers/shared';
import type { VoiceConfig } from './types';

function getDb() {
  return getFirestore();
}

export const DEFAULT_RECORDING_DISCLOSURE =
  'Antes de continuar, te informo que esta llamada puede ser grabada con propósitos de calidad y entrenamiento.';

export function buildDefaultVoiceConfig(tenantId: string, businessName?: string): VoiceConfig {
  return {
    tenantId,
    enabled: false,
    inboundEnabled: true,
    outboundEnabled: true,
    persona: {
      agentName: 'Valeria',
      businessName: businessName || '',
      gender: 'female',
      voiceId: 'marin',
      tone: 'cercano',
    },
    recordingDisclosure: DEFAULT_RECORDING_DISCLOSURE,
    service: {
      serviceAppointmentsEnabled: false,
      serviceSlotMinutes: 60,
      servicesOffered: [],
    },
    incentives: [],
    socialAutoCall: {
      metaLeadAdsEnabled: false,
      whatsappEnabled: false,
      messengerEnabled: false,
      instagramEnabled: false,
      delayMinutes: 5,
      onlyBusinessHours: true,
    },
  };
}

export async function getVoiceConfig(tenantId: string): Promise<VoiceConfig | null> {
  const doc = await getDb().collection('voice_config').doc(tenantId).get();
  if (!doc.exists) return null;
  return { ...(doc.data() as VoiceConfig), tenantId };
}

export async function getVoiceConfigOrDefault(tenantId: string, businessName?: string): Promise<VoiceConfig> {
  const existing = await getVoiceConfig(tenantId);
  return existing || buildDefaultVoiceConfig(tenantId, businessName);
}

export async function saveVoiceConfig(
  tenantId: string,
  patch: Partial<VoiceConfig>,
  updatedBy?: string
): Promise<VoiceConfig> {
  const ref = getDb().collection('voice_config').doc(tenantId);
  const current = await getVoiceConfigOrDefault(tenantId);
  const next: VoiceConfig = {
    ...current,
    ...patch,
    tenantId,
    persona: { ...current.persona, ...(patch.persona || {}) },
    service: { ...current.service, ...(patch.service || {}) },
    socialAutoCall: { ...current.socialAutoCall, ...(patch.socialAutoCall || {}) },
    incentives: patch.incentives !== undefined ? patch.incentives : current.incentives,
    provisioning:
      patch.provisioning !== undefined
        ? { ...(current.provisioning || {}), ...patch.provisioning }
        : current.provisioning,
    updatedAt: new Date(),
    updatedBy,
  };
  await ref.set(JSON.parse(JSON.stringify(next)), { merge: false });
  return next;
}

/** Verifica si un momento dado cae dentro del horario configurado (zona del negocio asumida). */
export function isWithinBusinessHours(
  hours: VoiceConfig['businessHours'],
  date: Date = new Date()
): boolean {
  if (!hours) return true;
  const day = String(date.getDay());
  const config = hours[day];
  if (!config) return true;
  if (config.closed) return false;
  const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return hhmm >= config.open && hhmm <= config.close;
}

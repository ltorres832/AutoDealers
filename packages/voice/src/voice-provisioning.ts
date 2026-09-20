// Aprovisionamiento automático del Agente de Voz al activar una membresía con voiceAIEnabled:
// número Twilio propio (o reutilizado), Voice URL, voice_config listo y agente activo.

import { getFirestore } from '@autodealers/shared';
import { getTwilioCredentials, getTenantMembershipFeatures } from '@autodealers/core';
import {
  buildDefaultVoiceConfig,
  getVoiceConfig,
  saveVoiceConfig,
} from './voice-config';
import type { VoiceConfig } from './types';

export type VoiceProvisionStatus = 'ready' | 'pending' | 'error' | 'skipped';

export interface VoiceProvisionResult {
  ok: boolean;
  status: VoiceProvisionStatus;
  alreadyProvisioned?: boolean;
  skipped?: boolean;
  reason?: string;
  phoneNumber?: string;
  twilioSid?: string;
  config?: VoiceConfig;
}

function getDb() {
  return getFirestore();
}

function normalizeE164(phone: string): string {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

function inboundWebhookUrl(): string {
  const explicit = (process.env.VOICE_INBOUND_WEBHOOK_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const base = (process.env.VOICE_FUNCTIONS_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/twilioVoiceInbound`;
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'autodealers-7f62e';
  return `https://us-central1-${project}.cloudfunctions.net/twilioVoiceInbound`;
}

async function twilioAuthHeader(): Promise<{ accountSid: string; auth: string } | null> {
  const { accountSid, authToken } = await getTwilioCredentials();
  if (!accountSid || !authToken) return null;
  return {
    accountSid,
    auth: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
  };
}

async function getAssignedPhoneNumbers(): Promise<Set<string>> {
  const snap = await getDb().collection('voice_config').get();
  const set = new Set<string>();
  for (const doc of snap.docs) {
    const phone = normalizeE164(String((doc.data() as any)?.twilioPhoneNumber || ''));
    if (phone) set.add(phone);
  }
  return set;
}

async function listAccountIncomingNumbers(
  accountSid: string,
  auth: string
): Promise<Array<{ sid: string; phone_number: string; friendly_name?: string; voice_url?: string }>> {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`,
    { headers: { Authorization: auth } }
  );
  if (!res.ok) {
    throw new Error(`Twilio list numbers ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json: any = await res.json();
  return json.incoming_phone_numbers || [];
}

async function ensureVoiceUrlOnNumber(
  accountSid: string,
  auth: string,
  numberSid: string
): Promise<void> {
  const voiceUrl = inboundWebhookUrl();
  const body = new URLSearchParams({
    VoiceUrl: voiceUrl,
    VoiceMethod: 'POST',
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${numberSid}.json`,
    {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );
  if (!res.ok) {
    throw new Error(`Twilio update VoiceUrl ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

async function findReusableNumber(
  accountSid: string,
  auth: string
): Promise<{ sid: string; phone_number: string } | null> {
  const assigned = await getAssignedPhoneNumbers();
  const numbers = await listAccountIncomingNumbers(accountSid, auth);
  for (const n of numbers) {
    const phone = normalizeE164(n.phone_number);
    if (!phone || assigned.has(phone)) continue;
    return { sid: n.sid, phone_number: phone };
  }
  return null;
}

async function purchaseNewNumber(
  accountSid: string,
  auth: string,
  friendlyName: string
): Promise<{ sid: string; phone_number: string }> {
  let candidate: { phone_number: string } | null = null;
  for (const areaCode of ['787', '939', '']) {
    const qs = new URLSearchParams({ VoiceEnabled: 'true', PageSize: '5' });
    if (areaCode) qs.set('AreaCode', areaCode);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?${qs}`,
      { headers: { Authorization: auth } }
    );
    if (!res.ok) continue;
    const json: any = await res.json();
    const nums = json.available_phone_numbers || [];
    if (nums.length) {
      candidate = nums[0];
      break;
    }
  }
  if (!candidate?.phone_number) {
    throw new Error('No hay números Twilio disponibles (PR/US) para asignar al agente de voz.');
  }

  const body = new URLSearchParams({
    PhoneNumber: candidate.phone_number,
    VoiceUrl: inboundWebhookUrl(),
    VoiceMethod: 'POST',
    FriendlyName: friendlyName.slice(0, 64),
  });
  const buy = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );
  if (!buy.ok) {
    throw new Error(`Twilio compra de número falló ${buy.status}: ${(await buy.text()).slice(0, 400)}`);
  }
  const purchased: any = await buy.json();
  return {
    sid: purchased.sid,
    phone_number: normalizeE164(purchased.phone_number),
  };
}

async function resolveBusinessName(tenantId: string): Promise<string> {
  try {
    const doc = await getDb().collection('tenants').doc(tenantId).get();
    const name = String(doc.data()?.name || '').trim();
    if (name) return name;
  } catch {
    /* opcional */
  }
  return 'tu negocio';
}

/**
 * Si la membresía incluye voz y aún no hay línea lista: asigna número Twilio,
 * apunta el webhook y deja voice_config activo con defaults del negocio.
 * Idempotente: si ya hay número, solo asegura Voice URL y flags de membresía.
 */
export async function ensureVoiceProvisionedForTenant(
  tenantId: string,
  options?: { forceNewNumber?: boolean; updatedBy?: string; source?: string }
): Promise<VoiceProvisionResult> {
  if (!tenantId?.trim()) {
    return { ok: false, status: 'skipped', skipped: true, reason: 'tenantId vacío' };
  }

  const features = await getTenantMembershipFeatures(tenantId);
  if (!features || features.voiceAIEnabled !== true) {
    return {
      ok: true,
      status: 'skipped',
      skipped: true,
      reason: 'La membresía no incluye Agente de Voz IA',
    };
  }

  const inboundOn = features.voiceInboundEnabled !== false;
  const outboundOn = features.voiceOutboundEnabled !== false;
  const serviceOn = features.voiceServiceCallsEnabled === true;
  const businessName = await resolveBusinessName(tenantId);
  const existing = await getVoiceConfig(tenantId);
  const now = new Date();

  const applyReadyConfig = async (
    phone: string,
    twilioSid: string | undefined,
    source: string
  ): Promise<VoiceConfig> => {
    const base = existing || buildDefaultVoiceConfig(tenantId, businessName);
    return saveVoiceConfig(
      tenantId,
      {
        enabled: true,
        inboundEnabled: inboundOn,
        outboundEnabled: outboundOn,
        twilioPhoneNumber: phone,
        persona: {
          ...base.persona,
          businessName: base.persona?.businessName || businessName,
        },
        service: {
          ...base.service,
          serviceAppointmentsEnabled:
            serviceOn || base.service?.serviceAppointmentsEnabled === true,
        },
        socialAutoCall: {
          ...base.socialAutoCall,
          // Activa auto-llamadas por defecto si el plan permite outbound
          metaLeadAdsEnabled: outboundOn ? true : base.socialAutoCall?.metaLeadAdsEnabled,
          whatsappEnabled: outboundOn ? true : base.socialAutoCall?.whatsappEnabled,
          messengerEnabled: outboundOn ? true : base.socialAutoCall?.messengerEnabled,
          instagramEnabled: outboundOn ? true : base.socialAutoCall?.instagramEnabled,
        },
        provisioning: {
          status: 'ready',
          twilioSid,
          provisionedAt: now,
          source: options?.source || source,
        },
      },
      options?.updatedBy || 'voice-provisioning'
    );
  };

  const existingPhone = normalizeE164(existing?.twilioPhoneNumber || '');
  if (existingPhone && !options?.forceNewNumber) {
    try {
      const creds = await twilioAuthHeader();
      if (creds) {
        const numbers = await listAccountIncomingNumbers(creds.accountSid, creds.auth);
        const match = numbers.find((n) => normalizeE164(n.phone_number) === existingPhone);
        if (match) {
          await ensureVoiceUrlOnNumber(creds.accountSid, creds.auth, match.sid);
          const config = await applyReadyConfig(existingPhone, match.sid, 'ensure_existing');
          return {
            ok: true,
            status: 'ready',
            alreadyProvisioned: true,
            phoneNumber: existingPhone,
            twilioSid: match.sid,
            config,
          };
        }
      }
      // Número en config pero no en Twilio: se reasigna abajo
    } catch (error: any) {
      console.warn('[voice-provision] No se pudo verificar número existente:', error?.message || error);
    }
  }

  const creds = await twilioAuthHeader();
  if (!creds) {
    const pending = await saveVoiceConfig(
      tenantId,
      {
        enabled: false,
        inboundEnabled: inboundOn,
        outboundEnabled: outboundOn,
        persona: {
          ...(existing?.persona || buildDefaultVoiceConfig(tenantId, businessName).persona),
          businessName,
        },
        provisioning: {
          status: 'error',
          error: 'Faltan credenciales Twilio en la plataforma',
          provisionedAt: now,
          source: options?.source || 'auto',
        },
      },
      options?.updatedBy || 'voice-provisioning'
    );
    return {
      ok: false,
      status: 'error',
      reason: 'Faltan credenciales Twilio en la plataforma',
      config: pending,
    };
  }

  try {
    let assigned =
      !options?.forceNewNumber
        ? await findReusableNumber(creds.accountSid, creds.auth)
        : null;
    if (!assigned) {
      assigned = await purchaseNewNumber(
        creds.accountSid,
        creds.auth,
        `AutoDealers Voice — ${businessName}`
      );
    } else {
      await ensureVoiceUrlOnNumber(creds.accountSid, creds.auth, assigned.sid);
    }

    const config = await applyReadyConfig(assigned.phone_number, assigned.sid, 'auto');
    console.log(
      `[voice-provision] Tenant ${tenantId} listo con ${assigned.phone_number} (${assigned.sid})`
    );
    return {
      ok: true,
      status: 'ready',
      phoneNumber: assigned.phone_number,
      twilioSid: assigned.sid,
      config,
    };
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error(`[voice-provision] Error aprovisionando ${tenantId}:`, message);
    const failed = await saveVoiceConfig(
      tenantId,
      {
        enabled: existing?.enabled === true,
        inboundEnabled: inboundOn,
        outboundEnabled: outboundOn,
        persona: {
          ...(existing?.persona || buildDefaultVoiceConfig(tenantId, businessName).persona),
          businessName: existing?.persona?.businessName || businessName,
        },
        provisioning: {
          status: 'error',
          error: message.slice(0, 500),
          provisionedAt: now,
          source: options?.source || 'auto',
        },
      },
      options?.updatedBy || 'voice-provisioning'
    );
    return { ok: false, status: 'error', reason: message, config: failed };
  }
}

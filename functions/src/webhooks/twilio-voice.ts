// Webhooks de voz Twilio: llamadas entrantes, TwiML de salientes,
// status callbacks y cron de la cola de llamadas salientes.

import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import {
  createCallLog,
  updateCallLog,
  canUseVoiceAgent,
  getVoiceConfig,
  getDueOutboundCalls,
  markQueueItem,
  handleQueueItemFailure,
  getLeadConversationMemory,
} from '@autodealers/voice';
import { findLeadByPhoneInTenant, getLeadById } from '@autodealers/crm';
import { getTwilioCredentials } from '@autodealers/core';
import { publicWebhookHttpsOptions } from './public-http';

/** El bundle de voz carga @autodealers/core completo; 256MiB no alcanza. */
const voiceHttpsOptions = { ...publicWebhookHttpsOptions, memory: '512MiB' as const };

const db = getFirestore();

function voiceBridgeWsUrl(): string {
  const host = (process.env.VOICE_BRIDGE_HOST || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return host ? `wss://${host}/twilio-stream` : '';
}

function functionsBaseUrl(): string {
  return (process.env.VOICE_FUNCTIONS_BASE_URL || '').replace(/\/$/, '');
}

/** Base URL de Cloud Functions para callbacks TwiML (Record / Gather). */
function resolveFunctionsBase(req: { get?: (name: string) => string | undefined }): string {
  const configured = functionsBaseUrl();
  if (configured) return configured;
  const host = String(req.get?.('x-forwarded-host') || req.get?.('host') || '')
    .split(',')[0]
    .trim();
  const proto = String(req.get?.('x-forwarded-proto') || 'https')
    .split(',')[0]
    .trim();
  return host ? `${proto}://${host}` : '';
}

function xmlEscape(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Buzón de voz real: Say → beep → Record (no Hangup inmediato).
 * Tras grabar, Twilio pide twilioVoiceVoicemailComplete (gracias + opción de escalar).
 */
function buildVoicemailTwiml(params: {
  baseUrl: string;
  tenantId: string;
  callLogId: string;
  sayText: string;
}): string {
  const qs = `tenantId=${encodeURIComponent(params.tenantId)}&callLogId=${encodeURIComponent(params.callLogId)}`;
  const actionUrl = `${params.baseUrl}/twilioVoiceVoicemailComplete?${qs}`;
  const recordingCb = `${params.baseUrl}/twilioVoiceRecording?${qs}`;

  return (
    `<?xml version="1.0" encoding="UTF-8"?><Response>` +
    `<Say language="es-US">${xmlEscape(params.sayText)}</Say>` +
    `<Record playBeep="true" maxLength="120" timeout="5" trim="trim-silence" ` +
    `action="${xmlEscape(actionUrl)}" method="POST" ` +
    `recordingStatusCallback="${xmlEscape(recordingCb)}" recordingStatusCallbackEvent="completed"/>` +
    `<Say language="es-US">No recibimos un mensaje. Gracias por llamar.</Say>` +
    `<Hangup/></Response>`
  );
}

function buildStreamTwiml(params: {
  tenantId: string;
  callLogId: string;
  callSid: string;
  direction: 'inbound' | 'outbound';
  leadId?: string;
  scenario?: string;
  extraContext?: Record<string, any>;
}): string | null {
  const wsUrl = voiceBridgeWsUrl();
  if (!wsUrl) return null;
  const parameters = [
    `<Parameter name="tenantId" value="${xmlEscape(params.tenantId)}"/>`,
    `<Parameter name="callLogId" value="${xmlEscape(params.callLogId)}"/>`,
    `<Parameter name="callSid" value="${xmlEscape(params.callSid)}"/>`,
    `<Parameter name="direction" value="${params.direction}"/>`,
    params.leadId ? `<Parameter name="leadId" value="${xmlEscape(params.leadId)}"/>` : '',
    params.scenario ? `<Parameter name="scenario" value="${xmlEscape(params.scenario)}"/>` : '',
    params.extraContext
      ? `<Parameter name="extraContext" value="${xmlEscape(JSON.stringify(params.extraContext))}"/>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${xmlEscape(wsUrl)}">${parameters}</Stream></Connect></Response>`;
}

async function resolveInboundLead(
  tenantId: string,
  from: string
): Promise<{ leadId?: string; assignedTo?: string }> {
  try {
    const lead = await findLeadByPhoneInTenant(tenantId, from);
    if (lead) return { leadId: lead.id, assignedTo: lead.assignedTo };
  } catch {
    /* cliente nuevo */
  }
  return {};
}

async function startInboundVoicemail(params: {
  req: { get?: (name: string) => string | undefined };
  tenantId: string;
  callSid: string;
  from: string;
  to: string;
  sayText: string;
  reason: string;
}): Promise<string> {
  const { leadId, assignedTo } = await resolveInboundLead(params.tenantId, params.from);
  const callLog = await createCallLog({
    tenantId: params.tenantId,
    leadId,
    assignedTo,
    direction: 'inbound',
    twilioCallSid: params.callSid || 'pending',
    fromNumber: params.from,
    toNumber: params.to,
    metadata: { fallback: 'voicemail', reason: params.reason },
  });
  await updateCallLog(params.tenantId, callLog.id, {
    status: 'in_progress',
    startedAt: new Date(),
    outcome: 'voicemail',
  });

  const baseUrl = resolveFunctionsBase(params.req);
  if (!baseUrl) {
    console.error('[twilio-voice] Sin VOICE_FUNCTIONS_BASE_URL ni Host para buzón de voz');
    return (
      `<?xml version="1.0" encoding="UTF-8"?><Response>` +
      `<Say language="es-US">${xmlEscape(params.sayText)} Lo sentimos, el buzón no está disponible. Intente más tarde.</Say>` +
      `<Hangup/></Response>`
    );
  }

  return buildVoicemailTwiml({
    baseUrl,
    tenantId: params.tenantId,
    callLogId: callLog.id,
    sayText: params.sayText,
  });
}

async function resolveTenantByTwilioNumber(toNumber: string): Promise<string | null> {
  if (!toNumber) return null;
  const snap = await db
    .collection('voice_config')
    .where('twilioPhoneNumber', '==', toNumber)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;
  // Fallback: número global de la plataforma con un solo tenant configurado
  return null;
}

/**
 * Webhook de llamada entrante (configurar como Voice URL del número Twilio).
 */
export const twilioVoiceInbound = onRequest(voiceHttpsOptions, async (req, res) => {
  try {
    const callSid = String(req.body?.CallSid || req.query.CallSid || '');
    const from = String(req.body?.From || '');
    const to = String(req.body?.To || '');

    const tenantId = await resolveTenantByTwilioNumber(to);
    if (!tenantId) {
      console.warn(`[twilio-voice] Sin tenant para el número ${to}`);
      res
        .status(200)
        .type('text/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="es-US">Número no configurado.</Say><Hangup/></Response>`
        );
      return;
    }

    const config = await getVoiceConfig(tenantId);
    if (!config?.enabled || !config.inboundEnabled) {
      const twiml = await startInboundVoicemail({
        req,
        tenantId,
        callSid,
        from,
        to,
        reason: 'inbound_disabled',
        sayText:
          'Gracias por llamar. En este momento no podemos atenderle. Deje su mensaje después del tono.',
      });
      res.status(200).type('text/xml').send(twiml);
      return;
    }

    const access = await canUseVoiceAgent(tenantId, 'inbound');
    if (!access.allowed) {
      console.warn(`[twilio-voice] Acceso denegado para ${tenantId}: ${access.reason}`);
      const twiml = await startInboundVoicemail({
        req,
        tenantId,
        callSid,
        from,
        to,
        reason: access.reason || 'membership_denied',
        sayText:
          'Gracias por llamar. En este momento no podemos atenderle con el asistente de voz. Deje su mensaje después del tono.',
      });
      res.status(200).type('text/xml').send(twiml);
      return;
    }

    const { leadId, assignedTo } = await resolveInboundLead(tenantId, from);

    const callLog = await createCallLog({
      tenantId,
      leadId,
      assignedTo,
      direction: 'inbound',
      twilioCallSid: callSid,
      fromNumber: from,
      toNumber: to,
    });
    await updateCallLog(tenantId, callLog.id, { status: 'in_progress', startedAt: new Date() });

    const streamTwiml = buildStreamTwiml({
      tenantId,
      callLogId: callLog.id,
      callSid,
      direction: 'inbound',
      leadId,
    });
    if (!streamTwiml) {
      // Bridge caído: buzón real en lugar de colgar tras el mensaje
      const baseUrl = resolveFunctionsBase(req);
      if (baseUrl) {
        await updateCallLog(tenantId, callLog.id, {
          outcome: 'voicemail',
          metadata: { fallback: 'voicemail', reason: 'bridge_unavailable' },
        });
        res
          .status(200)
          .type('text/xml')
          .send(
            buildVoicemailTwiml({
              baseUrl,
              tenantId,
              callLogId: callLog.id,
              sayText:
                'Gracias por llamar. El asistente no está disponible ahora. Deje su mensaje después del tono.',
            })
          );
        return;
      }
      res
        .status(200)
        .type('text/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="es-US">Lo sentimos, el sistema no está disponible en este momento. Por favor intente más tarde.</Say><Hangup/></Response>`
        );
      return;
    }

    res.status(200).type('text/xml').send(streamTwiml);
  } catch (error) {
    console.error('[twilio-voice] Error en webhook inbound:', error);
    res
      .status(200)
      .type('text/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
});

/**
 * TwiML para llamadas salientes (Twilio lo consulta cuando el cliente contesta).
 * Query params: tenantId, callLogId, leadId, scenario.
 */
export const twilioVoiceTwiml = onRequest(voiceHttpsOptions, async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId || '');
    const callLogId = String(req.query.callLogId || '');
    const leadId = String(req.query.leadId || '') || undefined;
    const scenario = String(req.query.scenario || '') || undefined;
    const callSid = String(req.body?.CallSid || req.query.CallSid || '');

    if (!tenantId || !callLogId) {
      res
        .status(200)
        .type('text/xml')
        .send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
      return;
    }

    await updateCallLog(tenantId, callLogId, { status: 'in_progress', startedAt: new Date() });

    let extraContext: Record<string, any> | undefined;
    try {
      const queueSnap = await db
        .collection('voice_outbound_queue')
        .where('callId', '==', callLogId)
        .limit(1)
        .get();
      if (!queueSnap.empty) {
        extraContext = (queueSnap.docs[0].data() as any).context || undefined;
      }
    } catch {
      /* opcional */
    }

    const streamTwiml = buildStreamTwiml({
      tenantId,
      callLogId,
      callSid,
      direction: 'outbound',
      leadId,
      scenario,
      extraContext,
    });
    if (!streamTwiml) {
      res
        .status(200)
        .type('text/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="es-US">Lo sentimos, el sistema no está disponible en este momento. Por favor intente más tarde.</Say><Hangup/></Response>`
        );
      return;
    }
    res.status(200).type('text/xml').send(streamTwiml);
  } catch (error) {
    console.error('[twilio-voice] Error en TwiML outbound:', error);
    res
      .status(200)
      .type('text/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
});

/**
 * Tras grabar el buzón: agradecer y, si hay escalación, ofrecer marcar 1.
 */
export const twilioVoiceVoicemailComplete = onRequest(voiceHttpsOptions, async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId || '');
    const callLogId = String(req.query.callLogId || '');
    const recordingUrl = String(req.body?.RecordingUrl || '');
    const recordingDuration = Number(req.body?.RecordingDuration || 0);

    if (tenantId && callLogId) {
      const patch: Record<string, unknown> = {
        status: 'completed',
        outcome: 'voicemail',
        endedAt: new Date(),
      };
      if (recordingUrl) patch.twilioRecordingUrl = recordingUrl;
      if (recordingDuration > 0) patch.durationSeconds = recordingDuration;
      await updateCallLog(tenantId, callLogId, patch as any);
    }

    const config = tenantId ? await getVoiceConfig(tenantId) : null;
    const escalation = (config?.escalationPhoneNumber || '').trim();
    const baseUrl = resolveFunctionsBase(req);

    if (escalation && baseUrl && tenantId && callLogId) {
      const qs = `tenantId=${encodeURIComponent(tenantId)}&callLogId=${encodeURIComponent(callLogId)}`;
      const actionUrl = `${baseUrl}/twilioVoiceVoicemailMenu?${qs}`;
      res
        .status(200)
        .type('text/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><Response>` +
            `<Say language="es-US">Gracias. Hemos recibido su mensaje.</Say>` +
            `<Gather numDigits="1" timeout="8" action="${xmlEscape(actionUrl)}" method="POST">` +
            `<Say language="es-US">Si desea hablar con un asesor ahora, marque 1. De lo contrario, puede colgar.</Say>` +
            `</Gather>` +
            `<Say language="es-US">Gracias por llamar. Hasta pronto.</Say>` +
            `<Hangup/></Response>`
        );
      return;
    }

    res
      .status(200)
      .type('text/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><Response>` +
          `<Say language="es-US">Gracias. Hemos recibido su mensaje. Nos comunicaremos pronto. Hasta pronto.</Say>` +
          `<Hangup/></Response>`
      );
  } catch (error) {
    console.error('[twilio-voice] Error en voicemail complete:', error);
    res
      .status(200)
      .type('text/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><Response>` +
          `<Say language="es-US">Gracias por llamar.</Say><Hangup/></Response>`
      );
  }
});

/**
 * Menú post-buzón: 1 = transferir a escalationPhoneNumber.
 */
export const twilioVoiceVoicemailMenu = onRequest(voiceHttpsOptions, async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId || '');
    const callLogId = String(req.query.callLogId || '');
    const digits = String(req.body?.Digits || '').trim();

    const config = tenantId ? await getVoiceConfig(tenantId) : null;
    const escalation = (config?.escalationPhoneNumber || '').trim();

    if (digits === '1' && escalation) {
      if (tenantId && callLogId) {
        await updateCallLog(tenantId, callLogId, { outcome: 'escalated' } as any);
      }
      res
        .status(200)
        .type('text/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><Response>` +
            `<Say language="es-US">Lo transferimos con un asesor. Un momento por favor.</Say>` +
            `<Dial>${xmlEscape(escalation)}</Dial>` +
            `<Hangup/></Response>`
        );
      return;
    }

    res
      .status(200)
      .type('text/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><Response>` +
          `<Say language="es-US">Gracias por llamar. Hasta pronto.</Say>` +
          `<Hangup/></Response>`
      );
  } catch (error) {
    console.error('[twilio-voice] Error en voicemail menu:', error);
    res
      .status(200)
      .type('text/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
});

/**
 * Status callback de llamadas (completed, no-answer, busy, failed).
 * Query params: tenantId, callLogId.
 */
export const twilioVoiceStatus = onRequest(voiceHttpsOptions, async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId || '');
    const callLogId = String(req.query.callLogId || '');
    const callStatus = String(req.body?.CallStatus || '');
    const duration = Number(req.body?.CallDuration || 0);

    if (tenantId && callLogId && callStatus) {
      const statusMap: Record<string, any> = {
        completed: 'completed',
        busy: 'busy',
        'no-answer': 'no_answer',
        failed: 'failed',
        canceled: 'canceled',
        ringing: 'ringing',
        'in-progress': 'in_progress',
      };
      const mapped = statusMap[callStatus];
      if (mapped) {
        const patch: any = { status: mapped };
        if (duration > 0) patch.durationSeconds = duration;
        if (['completed', 'busy', 'no_answer', 'failed', 'canceled'].includes(mapped)) {
          patch.endedAt = new Date();
        }
        await updateCallLog(tenantId, callLogId, patch);
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('[twilio-voice] Error en status callback:', error);
    res.status(200).send('OK');
  }
});

/**
 * Cron: procesa la cola de llamadas salientes (voice_outbound_queue).
 */
export const processVoiceOutboundQueue = onSchedule(
  {
    schedule: '*/2 * * * *',
    timeZone: 'America/Puerto_Rico',
    retryCount: 0,
  },
  async () => {
    const due = await getDueOutboundCalls(10);
    if (!due.length) return;

    const { accountSid, authToken } = await getTwilioCredentials();
    const baseUrl = functionsBaseUrl();
    if (!accountSid || !authToken || !baseUrl) {
      console.error('[twilio-voice] Faltan credenciales Twilio o VOICE_FUNCTIONS_BASE_URL');
      return;
    }

    for (const item of due) {
      try {
        await markQueueItem(item.id, { status: 'in_progress' });

        // Guardas en tiempo real: membresía, config y do-not-call
        const access = await canUseVoiceAgent(item.tenantId, 'outbound');
        if (!access.allowed) {
          await markQueueItem(item.id, { status: 'skipped', lastError: access.reason });
          continue;
        }
        const config = await getVoiceConfig(item.tenantId);
        if (!config?.enabled || !config.outboundEnabled) {
          await markQueueItem(item.id, { status: 'skipped', lastError: 'Agente de voz desactivado' });
          continue;
        }
        const memory = await getLeadConversationMemory(item.tenantId, item.leadId);
        if (memory?.doNotCall) {
          await markQueueItem(item.id, { status: 'canceled', lastError: 'Cliente pidió no ser llamado' });
          continue;
        }

        const fromNumber = config.twilioPhoneNumber || (await getTwilioCredentials()).phoneNumber;
        if (!fromNumber) {
          await markQueueItem(item.id, { status: 'failed', lastError: 'Sin número Twilio configurado' });
          continue;
        }

        let assignedTo: string | undefined;
        try {
          const lead = await getLeadById(item.tenantId, item.leadId);
          assignedTo = lead?.assignedTo;
        } catch {
          /* opcional */
        }

        const callLog = await createCallLog({
          tenantId: item.tenantId,
          leadId: item.leadId,
          assignedTo,
          direction: 'outbound',
          scenario: item.scenario,
          twilioCallSid: 'pending',
          fromNumber,
          toNumber: item.toNumber,
        });

        const qs = new URLSearchParams({
          tenantId: item.tenantId,
          callLogId: callLog.id,
          ...(item.leadId ? { leadId: item.leadId } : {}),
          ...(item.scenario ? { scenario: item.scenario } : {}),
        }).toString();

        const body = new URLSearchParams({
          To: item.toNumber,
          From: fromNumber,
          Url: `${baseUrl}/twilioVoiceTwiml?${qs}`,
          StatusCallback: `${baseUrl}/twilioVoiceStatus?tenantId=${item.tenantId}&callLogId=${callLog.id}`,
          StatusCallbackEvent: 'completed',
          Record: 'true',
          RecordingStatusCallback: `${baseUrl}/twilioVoiceRecording?tenantId=${item.tenantId}&callLogId=${callLog.id}`,
          RecordingChannels: 'dual',
          Timeout: '25',
        });

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          await updateCallLog(item.tenantId, callLog.id, { status: 'failed' });
          await handleQueueItemFailure(item, `Twilio ${response.status}: ${errText.slice(0, 300)}`);
          continue;
        }

        const call: any = await response.json();
        await updateCallLog(item.tenantId, callLog.id, {
          twilioCallSid: call.sid,
          status: 'ringing',
        });
        await markQueueItem(item.id, { status: 'completed', callId: callLog.id });
        console.log(`[twilio-voice] Llamada saliente iniciada: ${call.sid} (${item.scenario})`);
      } catch (error: any) {
        console.error('[twilio-voice] Error procesando item de cola:', error);
        await handleQueueItemFailure(item, error?.message || 'Error desconocido');
      }
    }
  }
);

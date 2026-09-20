// Registro de llamadas (call_logs) por tenant

import { getFirestore } from '@autodealers/shared';
import type { CallLog, CallTranscriptTurn, CallOutcome, CallDirection, OutboundCallScenario } from './types';

function getDb() {
  return getFirestore();
}

function callLogsRef(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('call_logs');
}

function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

function normalizeCallLog(id: string, data: any): CallLog {
  return {
    ...data,
    id,
    startedAt: toDate(data.startedAt),
    endedAt: toDate(data.endedAt),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  } as CallLog;
}

export interface CreateCallLogInput {
  tenantId: string;
  leadId?: string;
  assignedTo?: string;
  direction: CallDirection;
  scenario?: OutboundCallScenario;
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
  metadata?: Record<string, any>;
}

export async function createCallLog(input: CreateCallLogInput): Promise<CallLog> {
  const now = new Date();
  const docRef = callLogsRef(input.tenantId).doc();
  const log: CallLog = {
    id: docRef.id,
    tenantId: input.tenantId,
    leadId: input.leadId,
    assignedTo: input.assignedTo,
    direction: input.direction,
    scenario: input.scenario,
    twilioCallSid: input.twilioCallSid,
    fromNumber: input.fromNumber,
    toNumber: input.toNumber,
    status: 'queued',
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
  await docRef.set(JSON.parse(JSON.stringify(log)));
  return log;
}

export async function updateCallLog(
  tenantId: string,
  callId: string,
  patch: Partial<CallLog>
): Promise<void> {
  const clean = JSON.parse(JSON.stringify({ ...patch, updatedAt: new Date() }));
  await callLogsRef(tenantId).doc(callId).set(clean, { merge: true });
}

export async function getCallLog(tenantId: string, callId: string): Promise<CallLog | null> {
  const doc = await callLogsRef(tenantId).doc(callId).get();
  if (!doc.exists) return null;
  return normalizeCallLog(doc.id, doc.data());
}

export async function findCallLogByTwilioSid(
  tenantId: string,
  twilioCallSid: string
): Promise<CallLog | null> {
  const snap = await callLogsRef(tenantId)
    .where('twilioCallSid', '==', twilioCallSid)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return normalizeCallLog(doc.id, doc.data());
}

export async function getCallLogsForLead(
  tenantId: string,
  leadId: string,
  limit = 20
): Promise<CallLog[]> {
  const snap = await callLogsRef(tenantId)
    .where('leadId', '==', leadId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => normalizeCallLog(d.id, d.data()));
}

export async function getRecentCallLogs(tenantId: string, limit = 50): Promise<CallLog[]> {
  const snap = await callLogsRef(tenantId).orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => normalizeCallLog(d.id, d.data()));
}

export interface FinalizeCallInput {
  status?: CallLog['status'];
  endedAt?: Date;
  durationSeconds?: number;
  transcript?: CallTranscriptTurn[];
  summary?: string;
  nextSteps?: string[];
  outcome?: CallOutcome;
  identityConfirmed?: boolean;
  disclosureGiven?: boolean;
}

/**
 * Finaliza la llamada: guarda transcript/resumen, calcula minutos facturables
 * y registra la interacción `call` en el lead del CRM.
 */
export async function finalizeCallLog(
  tenantId: string,
  callId: string,
  input: FinalizeCallInput
): Promise<CallLog | null> {
  const existing = await getCallLog(tenantId, callId);
  if (!existing) return null;

  const durationSeconds =
    input.durationSeconds ??
    (existing.startedAt && input.endedAt
      ? Math.max(0, Math.round((input.endedAt.getTime() - existing.startedAt.getTime()) / 1000))
      : existing.durationSeconds);

  const billedMinutes = durationSeconds ? Math.ceil(durationSeconds / 60) : 0;

  await updateCallLog(tenantId, callId, {
    status: input.status || 'completed',
    endedAt: input.endedAt || new Date(),
    durationSeconds,
    transcript: input.transcript ?? existing.transcript,
    summary: input.summary ?? existing.summary,
    nextSteps: input.nextSteps ?? existing.nextSteps,
    outcome: input.outcome ?? existing.outcome,
    identityConfirmed: input.identityConfirmed ?? existing.identityConfirmed,
    disclosureGiven: input.disclosureGiven ?? existing.disclosureGiven,
    billedMinutes,
  });

  // Registrar interacción en el lead (timeline del CRM)
  if (existing.leadId) {
    try {
      const { addInteraction } = await import('@autodealers/crm');
      const summaryText =
        input.summary ||
        `Llamada ${existing.direction === 'inbound' ? 'entrante' : 'saliente'} (${billedMinutes} min)`;
      await addInteraction(tenantId, existing.leadId, {
        type: 'call',
        content: summaryText,
        userId: 'voice-agent',
        metadata: {
          callId,
          direction: existing.direction,
          scenario: existing.scenario || null,
          durationSeconds: durationSeconds || 0,
          outcome: input.outcome || existing.outcome || null,
          recordingStoragePath: existing.recordingStoragePath || null,
          hasTranscript: Boolean(input.transcript?.length || existing.transcript?.length),
        },
      });
    } catch (error) {
      console.error('[voice] Error registrando interacción de llamada en CRM:', error);
    }
  }

  return getCallLog(tenantId, callId);
}

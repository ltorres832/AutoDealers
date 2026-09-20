// Cola de llamadas salientes (voice_outbound_queue)

import { getFirestore } from '@autodealers/shared';
import type { VoiceOutboundQueueItem, OutboundCallScenario } from './types';

function getDb() {
  return getFirestore();
}

function queueRef() {
  return getDb().collection('voice_outbound_queue');
}

function toDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function normalize(id: string, data: any): VoiceOutboundQueueItem {
  return {
    ...data,
    id,
    scheduledFor: toDate(data.scheduledFor),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as VoiceOutboundQueueItem;
}

export interface EnqueueOutboundCallInput {
  tenantId: string;
  leadId: string;
  scenario: OutboundCallScenario;
  toNumber: string;
  scheduledFor?: Date;
  context?: Record<string, any>;
  maxAttempts?: number;
}

export async function enqueueOutboundCall(
  input: EnqueueOutboundCallInput
): Promise<VoiceOutboundQueueItem> {
  // Evitar duplicados: mismo lead + escenario pendiente
  const dupSnap = await queueRef()
    .where('tenantId', '==', input.tenantId)
    .where('leadId', '==', input.leadId)
    .where('scenario', '==', input.scenario)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (!dupSnap.empty) {
    return normalize(dupSnap.docs[0].id, dupSnap.docs[0].data());
  }

  const now = new Date();
  const docRef = queueRef().doc();
  const item: VoiceOutboundQueueItem = {
    id: docRef.id,
    tenantId: input.tenantId,
    leadId: input.leadId,
    scenario: input.scenario,
    toNumber: input.toNumber,
    scheduledFor: input.scheduledFor || now,
    status: 'pending',
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 3,
    context: input.context || {},
    createdAt: now,
    updatedAt: now,
  };
  await docRef.set(JSON.parse(JSON.stringify(item)));
  return item;
}

/** Items pendientes cuyo scheduledFor ya pasó. */
export async function getDueOutboundCalls(limit = 20): Promise<VoiceOutboundQueueItem[]> {
  const snap = await queueRef()
    .where('status', '==', 'pending')
    .where('scheduledFor', '<=', new Date())
    .orderBy('scheduledFor', 'asc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => normalize(d.id, d.data()));
}

export async function markQueueItem(
  itemId: string,
  patch: Partial<Pick<VoiceOutboundQueueItem, 'status' | 'attempts' | 'lastError' | 'callId' | 'scheduledFor'>>
): Promise<void> {
  await queueRef()
    .doc(itemId)
    .set(JSON.parse(JSON.stringify({ ...patch, updatedAt: new Date() })), { merge: true });
}

/** Reintento con backoff: reprograma o marca como fallida si agotó intentos. */
export async function handleQueueItemFailure(
  item: VoiceOutboundQueueItem,
  error: string
): Promise<void> {
  const attempts = item.attempts + 1;
  if (attempts >= item.maxAttempts) {
    await markQueueItem(item.id, { status: 'failed', attempts, lastError: error });
    return;
  }
  const backoffMinutes = Math.pow(2, attempts) * 15; // 30m, 60m, 120m...
  await markQueueItem(item.id, {
    status: 'pending',
    attempts,
    lastError: error,
    scheduledFor: new Date(Date.now() + backoffMinutes * 60 * 1000),
  });
}

export async function cancelPendingCallsForLead(tenantId: string, leadId: string): Promise<number> {
  const snap = await queueRef()
    .where('tenantId', '==', tenantId)
    .where('leadId', '==', leadId)
    .where('status', '==', 'pending')
    .get();
  await Promise.all(snap.docs.map((d) => markQueueItem(d.id, { status: 'canceled' })));
  return snap.size;
}

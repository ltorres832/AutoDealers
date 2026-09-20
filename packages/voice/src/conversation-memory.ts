// Memoria conversacional persistente por lead
// tenants/{tenantId}/lead_conversation_memory/{leadId}

import { getFirestore } from '@autodealers/shared';
import type { LeadConversationMemory, PurchaseBlocker, CallOutcome } from './types';

function getDb() {
  return getFirestore();
}

function memoryRef(tenantId: string, leadId: string) {
  return getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('lead_conversation_memory')
    .doc(leadId);
}

export async function getLeadConversationMemory(
  tenantId: string,
  leadId: string
): Promise<LeadConversationMemory | null> {
  const doc = await memoryRef(tenantId, leadId).get();
  if (!doc.exists) return null;
  return { ...(doc.data() as LeadConversationMemory), leadId, tenantId };
}

export async function saveLeadConversationMemory(
  tenantId: string,
  leadId: string,
  patch: Partial<LeadConversationMemory>
): Promise<void> {
  const clean = JSON.parse(
    JSON.stringify({ ...patch, leadId, tenantId, updatedAt: new Date() })
  );
  await memoryRef(tenantId, leadId).set(clean, { merge: true });
}

/** Añade un impedimento de compra detectado en conversación. */
export async function addPurchaseBlocker(
  tenantId: string,
  leadId: string,
  description: string
): Promise<PurchaseBlocker> {
  const memory = await getLeadConversationMemory(tenantId, leadId);
  const blockers = memory?.purchaseBlockers || [];
  const normalized = description.trim().toLowerCase();
  const existing = blockers.find(
    (b) => !b.resolved && b.description.trim().toLowerCase() === normalized
  );
  if (existing) return existing;

  const blocker: PurchaseBlocker = {
    id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    description: description.trim(),
    detectedAt: new Date().toISOString(),
    resolved: false,
  };
  await saveLeadConversationMemory(tenantId, leadId, {
    purchaseBlockers: [...blockers, blocker],
  });
  return blocker;
}

/** Marca un impedimento como resuelto (el agente felicitará al cliente en la próxima llamada). */
export async function resolvePurchaseBlocker(
  tenantId: string,
  leadId: string,
  blockerId: string
): Promise<void> {
  const memory = await getLeadConversationMemory(tenantId, leadId);
  if (!memory?.purchaseBlockers) return;
  const updated = memory.purchaseBlockers.map((b) =>
    b.id === blockerId ? { ...b, resolved: true, resolvedAt: new Date().toISOString() } : b
  );
  await saveLeadConversationMemory(tenantId, leadId, { purchaseBlockers: updated });
}

/** Marca que ya se felicitó al cliente por un impedimento resuelto. */
export async function markBlockerCongratulated(
  tenantId: string,
  leadId: string,
  blockerId: string
): Promise<void> {
  const memory = await getLeadConversationMemory(tenantId, leadId);
  if (!memory?.purchaseBlockers) return;
  const updated = memory.purchaseBlockers.map((b) =>
    b.id === blockerId ? { ...b, congratulated: true } : b
  );
  await saveLeadConversationMemory(tenantId, leadId, { purchaseBlockers: updated });
}

/**
 * Impedimentos resueltos que aún no se han celebrado con el cliente.
 * El agente debe felicitarlo al inicio de la próxima llamada.
 */
export function pendingCongratulations(memory: LeadConversationMemory | null): PurchaseBlocker[] {
  if (!memory?.purchaseBlockers) return [];
  return memory.purchaseBlockers.filter((b) => b.resolved && !b.congratulated);
}

/** Registra el resumen de una llamada en la memoria del lead (mantiene las últimas 10). */
export async function appendCallToMemory(
  tenantId: string,
  leadId: string,
  entry: { callId: string; summary: string; outcome?: CallOutcome }
): Promise<void> {
  const memory = await getLeadConversationMemory(tenantId, leadId);
  const lastCalls = [
    { ...entry, at: new Date().toISOString() },
    ...(memory?.lastCalls || []),
  ].slice(0, 10);
  await saveLeadConversationMemory(tenantId, leadId, { lastCalls });
}

/**
 * Expediente unificado: vinculación F&I ↔ Casos de cliente (customer_files) y etapa operativa.
 * Sin dependencias de finance-insurance para evitar ciclos de importación.
 */

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

export type ExpeditionStage =
  | 'intake'
  | 'documentation'
  | 'under_review'
  | 'decision'
  | 'closing'
  | 'closed';

const STAGE_LABELS: Record<ExpeditionStage, string> = {
  intake: 'Captación',
  documentation: 'Documentación',
  under_review: 'En análisis',
  decision: 'Decisión',
  closing: 'Cierre',
  closed: 'Cerrado',
};

export function expeditionStageLabel(stage: ExpeditionStage | string | undefined): string {
  if (!stage) return '—';
  return STAGE_LABELS[stage as ExpeditionStage] || String(stage);
}

/** Deriva la etapa del expediente a partir del estado formal de la solicitud F&I */
export function fiStatusToExpeditionStage(status: string): ExpeditionStage {
  switch (status) {
    case 'draft':
      return 'intake';
    case 'submitted':
      return 'documentation';
    case 'under_review':
    case 'pending_info':
      return 'under_review';
    case 'pre_approved':
      return 'decision';
    case 'approved':
      return 'closing';
    case 'rejected':
      return 'closed';
    default:
      return 'intake';
  }
}

function getDb() {
  return getFirestore();
}

/**
 * Tras crear o actualizar una solicitud F&I, replica etapa en el caso de cliente vinculado (si existe).
 */
export async function syncLinkedCustomerFileExpedition(
  tenantId: string,
  fiRequestId: string
): Promise<void> {
  const db = getDb();
  const reqSnap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(fiRequestId)
    .get();

  if (!reqSnap.exists) return;

  const data = reqSnap.data()!;
  const customerFileId = data.customerFileId as string | undefined;
  if (!customerFileId || typeof customerFileId !== 'string') return;

  const stage = fiStatusToExpeditionStage(String(data.status || 'draft'));

  const fileRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('customer_files')
    .doc(customerFileId);

  const fileSnap = await fileRef.get();
  if (!fileSnap.exists) return;

  await fileRef.update({
    expeditionStage: stage,
    linkedFiRequestId: fiRequestId,
    lastExpeditionSyncAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  } as Record<string, unknown>);
}

/**
 * Vincula bidireccionalmente un caso de cliente con una solicitud F&I y alinea etapa.
 */
export async function linkCustomerFileToFiRequest(
  tenantId: string,
  customerFileId: string,
  fiRequestId: string
): Promise<void> {
  const db = getDb();
  const reqRef = db.collection('tenants').doc(tenantId).collection('fi_requests').doc(fiRequestId);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) throw new Error('Solicitud F&I no encontrada');

  const fileRef = db.collection('tenants').doc(tenantId).collection('customer_files').doc(customerFileId);
  const fileSnap = await fileRef.get();
  if (!fileSnap.exists) throw new Error('Caso de cliente no encontrado');

  const status = String(reqSnap.data()?.status || 'draft');
  const stage = fiStatusToExpeditionStage(status);

  const batch = db.batch();
  batch.update(reqRef, {
    customerFileId,
    expeditionStage: stage,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  } as Record<string, unknown>);
  batch.update(fileRef, {
    linkedFiRequestId: fiRequestId,
    expeditionStage: stage,
    lastExpeditionSyncAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  } as Record<string, unknown>);
  await batch.commit();

  await syncLinkedCustomerFileExpedition(tenantId, fiRequestId);
}

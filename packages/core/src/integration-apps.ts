// Catálogo de eventos + “apps” conectadas (Zapier/Make / propias) — Fase 4

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { createOutboundWebhook, listOutboundWebhooks } from './public-api-webhooks';

function getDb() {
  return getFirestore();
}

/** Eventos que la plataforma puede emitir a webhooks / apps */
export const INTEGRATION_EVENT_CATALOG = [
  { id: 'lead.created', label: 'Lead creado', category: 'CRM' },
  { id: 'deal.updated', label: 'Deal actualizado', category: 'Ventas' },
  { id: 'deal.deposit_paid', label: 'Depósito pagado', category: 'Ventas' },
  { id: 'sale.completed', label: 'Venta completada', category: 'Ventas' },
  { id: 'ro.updated', label: 'RO actualizada', category: 'Servicio' },
  { id: 'ro.delivered', label: 'RO entregada', category: 'Servicio' },
  { id: 'po.received', label: 'PO recibida', category: 'Piezas' },
  { id: 'invoice.created', label: 'Factura AR creada', category: 'Finanzas' },
  { id: 'invoice.paid', label: 'Factura AR pagada', category: 'Finanzas' },
  { id: 'leave.requested', label: 'Vacaciones solicitadas', category: 'RR.HH.' },
] as const;

export type IntegrationEventId = (typeof INTEGRATION_EVENT_CATALOG)[number]['id'];

export interface ConnectedApp {
  id: string;
  tenantId: string;
  name: string;
  type: 'zapier' | 'make' | 'custom' | 'dms_legacy';
  webhookId?: string;
  status: 'active' | 'paused';
  events: string[];
  createdAt: Date;
  createdBy: string;
}

export async function listConnectedApps(tenantId: string): Promise<ConnectedApp[]> {
  const snap = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('connected_apps')
    .limit(50)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      tenantId,
      name: data.name,
      type: data.type || 'custom',
      webhookId: data.webhookId,
      status: data.status || 'active',
      events: data.events || [],
      createdAt: data.createdAt?.toDate?.() || new Date(),
      createdBy: data.createdBy || '',
    } as ConnectedApp;
  });
}

export async function registerConnectedApp(input: {
  tenantId: string;
  name: string;
  type: ConnectedApp['type'];
  targetUrl: string;
  events: string[];
  createdBy: string;
}): Promise<{ app: ConnectedApp; webhookSecret: string }> {
  const events =
    input.events?.length > 0
      ? input.events
      : INTEGRATION_EVENT_CATALOG.map((e) => e.id);

  const webhook = await createOutboundWebhook({
    tenantId: input.tenantId,
    url: input.targetUrl,
    events,
    createdBy: input.createdBy,
  });

  const ref = getDb().collection('tenants').doc(input.tenantId).collection('connected_apps').doc();
  const app: ConnectedApp = {
    id: ref.id,
    tenantId: input.tenantId,
    name: input.name.trim() || 'App',
    type: input.type,
    webhookId: webhook.id,
    status: 'active',
    events,
    createdAt: new Date(),
    createdBy: input.createdBy,
  };
  await ref.set({
    ...app,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return { app, webhookSecret: webhook.secret };
}

export async function pauseConnectedApp(tenantId: string, appId: string): Promise<void> {
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('connected_apps')
    .doc(appId)
    .set({ status: 'paused' }, { merge: true });
}

export async function resumeConnectedApp(tenantId: string, appId: string): Promise<void> {
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('connected_apps')
    .doc(appId)
    .set({ status: 'active' }, { merge: true });
}

export async function setConnectedAppStatus(
  tenantId: string,
  appId: string,
  status: 'active' | 'paused'
): Promise<void> {
  if (status === 'paused') return pauseConnectedApp(tenantId, appId);
  return resumeConnectedApp(tenantId, appId);
}

export async function getIntegrationCatalog() {
  const webhooksHint = await Promise.resolve(null);
  return {
    events: INTEGRATION_EVENT_CATALOG,
    partners: [
      { id: 'zapier', label: 'Zapier', hint: 'Usa la URL de Catch Hook como webhook' },
      { id: 'make', label: 'Make (Integromat)', hint: 'Custom webhook module' },
      { id: 'custom', label: 'App propia', hint: 'HTTPS + firma X-AutoDealers-Signature' },
      {
        id: 'dms_legacy',
        label: 'DMS legacy (CDK / Reynolds)',
        hint: 'Conector premium: export/import vía partner — configura URL de sync',
      },
    ],
    webhooksHint,
  };
}

export { listOutboundWebhooks };

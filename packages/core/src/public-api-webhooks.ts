// Webhooks salientes firmados (API pública v0)

import { createHmac, randomBytes } from 'crypto';
import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';

function getDb() {
  return getFirestore();
}

export interface OutboundWebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: Date;
  createdBy: string;
}

function webhooksCol(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('outbound_webhooks');
}

export function signWebhookPayload(secret: string, body: string, timestamp: number): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}

export async function createOutboundWebhook(input: {
  tenantId: string;
  url: string;
  events: string[];
  createdBy: string;
}): Promise<OutboundWebhookEndpoint> {
  const url = String(input.url || '').trim();
  if (!url.startsWith('https://') && !url.startsWith('http://localhost')) {
    throw new Error('La URL del webhook debe ser HTTPS (o localhost en desarrollo)');
  }
  const ref = webhooksCol(input.tenantId).doc();
  const secret = `whsec_${randomBytes(24).toString('hex')}`;
  const row: OutboundWebhookEndpoint = {
    id: ref.id,
    tenantId: input.tenantId,
    url,
    secret,
    events: input.events.length ? input.events : ['deal.updated', 'lead.created', 'sale.completed'],
    active: true,
    createdAt: new Date(),
    createdBy: input.createdBy,
  };
  await ref.set({
    ...row,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return row;
}

export async function listOutboundWebhooks(tenantId: string): Promise<OutboundWebhookEndpoint[]> {
  const snap = await webhooksCol(tenantId).limit(50).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      tenantId,
      url: data.url,
      secret: data.secret,
      events: data.events || [],
      active: data.active !== false,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      createdBy: data.createdBy || '',
    };
  });
}

export async function deleteOutboundWebhook(tenantId: string, webhookId: string): Promise<void> {
  await webhooksCol(tenantId).doc(webhookId).delete();
}

export async function dispatchTenantWebhook(
  tenantId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const endpoints = await listOutboundWebhooks(tenantId);
  const active = endpoints.filter((e) => e.active && e.events.includes(event));
  if (active.length === 0) return;

  const bodyObj = {
    id: `evt_${randomBytes(8).toString('hex')}`,
    type: event,
    created: Math.floor(Date.now() / 1000),
    data: payload,
  };
  const body = JSON.stringify(bodyObj);
  const ts = Math.floor(Date.now() / 1000);

  await Promise.all(
    active.map(async (ep) => {
      const sig = signWebhookPayload(ep.secret, body, ts);
      try {
        await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AutoDealers-Timestamp': String(ts),
            'X-AutoDealers-Signature': sig,
            'X-AutoDealers-Event': event,
          },
          body,
        });
      } catch (err) {
        console.warn(`[webhook] Falló entrega a ${ep.url}:`, err);
      }
    })
  );
}

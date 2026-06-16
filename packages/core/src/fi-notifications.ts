/**
 * Notificaciones F&I unificadas: gerente F&I, dealer/gerencia y vendedor.
 * Usa notifyUser (push, email, SMS, in-app) según preferencias de cada usuario.
 */

import { getFirestore } from '@autodealers/shared';
import type { NotificationType } from './notifications';
import { notifyUser } from './notifications';

const FI_TEAM_ROLES = ['dealer', 'master_dealer', 'manager', 'dealer_admin', 'fi_manager'] as const;

function getDb() {
  return getFirestore();
}

export interface FINotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

async function collectFIStakeholderIds(
  tenantId: string,
  options?: { sellerId?: string; excludeUserIds?: string[] }
): Promise<string[]> {
  const exclude = new Set(options?.excludeUserIds || []);
  const ids = new Set<string>();

  const tenantDoc = await getDb().collection('tenants').doc(tenantId).get();
  const fiManagerId = tenantDoc.data()?.fiManagerId as string | undefined;
  if (fiManagerId && !exclude.has(fiManagerId)) {
    ids.add(fiManagerId);
  }

  if (options?.sellerId && !exclude.has(options.sellerId)) {
    ids.add(options.sellerId);
  }

  for (const role of FI_TEAM_ROLES) {
    const snap = await getDb()
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', '==', role)
      .get();

    snap.docs.forEach((doc) => {
      if (exclude.has(doc.id)) return;
      const status = doc.data()?.status as string | undefined;
      if (status && status !== 'active') return;
      ids.add(doc.id);
    });
  }

  return [...ids];
}

/** Notifica a gerente F&I, dealer/gerencia y opcionalmente al vendedor. */
export async function notifyFIStakeholders(
  tenantId: string,
  payload: FINotificationPayload,
  options?: { sellerId?: string; excludeUserIds?: string[] }
): Promise<void> {
  try {
    const userIds = await collectFIStakeholderIds(tenantId, options);
    await Promise.all(
      userIds.map((userId) =>
        notifyUser(tenantId, userId, {
          type: payload.type,
          title: payload.title,
          message: payload.message,
          metadata: payload.metadata as Record<string, any> | undefined,
        })
      )
    );
  } catch (error) {
    console.error('Error notifying F&I stakeholders:', error);
  }
}

export async function notifyFIRequestSubmitted(
  tenantId: string,
  params: {
    requestId: string;
    clientName: string;
    sellerUserId: string;
  }
): Promise<void> {
  const { requestId, clientName, sellerUserId } = params;
  await notifyFIStakeholders(
    tenantId,
    {
      type: 'fi_request',
      title: 'Nueva solicitud F&I',
      message: `Solicitud F&I enviada para ${clientName}. Requiere revisión.`,
      metadata: {
        requestId,
        action: 'fi_request_submitted',
        route: `/fi/requests/${requestId}`,
      },
    },
    { excludeUserIds: [sellerUserId] }
  );
}

export async function notifyFIRequestStatusChanged(
  tenantId: string,
  params: {
    requestId: string;
    clientName: string;
    sellerUserId: string;
    status: string;
    statusLabel: string;
    changedByUserId?: string;
  }
): Promise<void> {
  const { requestId, clientName, sellerUserId, status, statusLabel, changedByUserId } = params;
  const metadata = {
    requestId,
    action: 'fi_request_status_changed',
    newStatus: status,
    route: `/fi/requests/${requestId}`,
  };

  await notifyUser(tenantId, sellerUserId, {
    type: 'fi_request',
    title: `Solicitud F&I ${statusLabel}`,
    message: `Tu solicitud F&I de ${clientName} ahora está: ${statusLabel}.`,
    metadata,
  });

  await notifyFIStakeholders(
    tenantId,
    {
      type: 'fi_request',
      title: `Solicitud F&I ${statusLabel}`,
      message: `La solicitud F&I de ${clientName} cambió a: ${statusLabel}.`,
      metadata,
    },
    {
      excludeUserIds: [sellerUserId, ...(changedByUserId ? [changedByUserId] : [])],
    }
  );
}

export async function notifyFIDocumentEvent(
  tenantId: string,
  params: {
    title: string;
    message: string;
    sellerId?: string;
    excludeUserIds?: string[];
    requestId?: string;
    clientId?: string;
    fileId?: string;
    route?: string;
  }
): Promise<void> {
  const route =
    params.route ||
    (params.requestId ? `/fi/requests/${params.requestId}` : params.fileId ? `/customer-files/${params.fileId}` : '/fi');

  await notifyFIStakeholders(
    tenantId,
    {
      type: 'document_uploaded',
      title: params.title,
      message: params.message,
      metadata: {
        requestId: params.requestId,
        clientId: params.clientId,
        fileId: params.fileId,
        route,
      },
    },
    {
      sellerId: params.sellerId,
      excludeUserIds: params.excludeUserIds,
    }
  );
}

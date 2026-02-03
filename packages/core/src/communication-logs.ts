// Sistema de logs de comunicaciones enviadas

import * as admin from 'firebase-admin';
import { getFirestore } from './firebase';
import { TemplateType, TemplateEvent } from './communication-templates';

let db: admin.firestore.Firestore | null = null;

function getDb() {
  if (!db) {
    db = getFirestore();
  }
  return db;
}

export interface CommunicationLog {
  id: string;
  templateId: string;
  templateName: string;
  event: TemplateEvent;
  type: TemplateType;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  tenantId: string;
  tenantName: string;
  status: 'success' | 'failed';
  messageId?: string;
  error?: string;
  sentAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Registra un envío de comunicación
 */
export async function logCommunication(data: {
  templateId: string;
  templateName: string;
  event: TemplateEvent;
  type: TemplateType;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  tenantId: string;
  tenantName: string;
  status: 'success' | 'failed';
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const firestore = getDb();
  const docRef = firestore.collection('communication_logs').doc();

  await docRef.set({
    ...data,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Crear notificación para el admin
  await createAdminNotification({
    type: 'communication_sent',
    title: `Template enviado: ${data.templateName}`,
    message: `Se envió un ${data.type} a ${data.recipientEmail} (Evento: ${data.event})`,
    data: {
      logId: docRef.id,
      templateId: data.templateId,
      tenantId: data.tenantId,
      status: data.status,
    },
  });

  return docRef.id;
}

/**
 * Obtiene logs con filtros
 */
export async function getCommunicationLogs(filters?: {
  tenantId?: string;
  type?: TemplateType;
  event?: TemplateEvent;
  status?: 'success' | 'failed';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<CommunicationLog[]> {
  const firestore = getDb();
  let query: admin.firestore.Query = firestore.collection('communication_logs');

  if (filters?.tenantId) {
    query = query.where('tenantId', '==', filters.tenantId);
  }
  if (filters?.type) {
    query = query.where('type', '==', filters.type);
  }
  if (filters?.event) {
    query = query.where('event', '==', filters.event);
  }
  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  // Ordenar por fecha descendente
  try {
    query = query.orderBy('sentAt', 'desc');
  } catch (error) {
    // Si falla por índice, continuar sin ordenar
    console.warn('Could not order by sentAt, index might be missing');
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      sentAt: data.sentAt?.toDate() || new Date(),
    } as CommunicationLog;
  });
}

/**
 * Obtiene estadísticas de comunicaciones
 */
export async function getCommunicationStats(filters?: {
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  total: number;
  success: number;
  failed: number;
  byType: Record<TemplateType, number>;
  byEvent: Record<TemplateEvent, number>;
}> {
  const logs = await getCommunicationLogs(filters);

  const stats = {
    total: logs.length,
    success: logs.filter((log) => log.status === 'success').length,
    failed: logs.filter((log) => log.status === 'failed').length,
    byType: {} as Record<TemplateType, number>,
    byEvent: {} as Record<TemplateEvent, number>,
  };

  logs.forEach((log) => {
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
    stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1;
  });

  return stats;
}

/**
 * Crea una notificación para el admin
 */
async function createAdminNotification(data: {
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}): Promise<void> {
  const firestore = getDb();

  // Obtener todos los admins
  const adminsSnapshot = await firestore
    .collection('users')
    .where('role', '==', 'admin')
    .get();

  // Crear notificación para cada admin
  const promises = adminsSnapshot.docs.map((adminDoc) =>
    firestore.collection('notifications').add({
      userId: adminDoc.id,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || {},
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  );

  await Promise.all(promises);
}

/**
 * Notifica al admin cuando se crea un nuevo template
 */
export async function notifyAdminTemplateCreated(data: {
  templateId: string;
  templateName: string;
  type: TemplateType;
  event: TemplateEvent;
  createdBy: string;
}): Promise<void> {
  await createAdminNotification({
    type: 'template_created',
    title: 'Nuevo template creado',
    message: `Se creó un nuevo template "${data.templateName}" (${data.type} - ${data.event})`,
    data: {
      templateId: data.templateId,
      templateName: data.templateName,
      type: data.type,
      event: data.event,
      createdBy: data.createdBy,
    },
  });
}



// Sistema de auditoría y logs

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export interface AuditLog {
  id: string;
  tenantId?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Obtiene logs de auditoría (solo para admin)
 */
export async function getAuditLogs(filters?: {
  action?: string;
  resource?: string;
  tenantId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditLog[]> {
  let query: admin.firestore.Query = getDb().collection('audit_logs');

  if (filters?.action) {
    query = query.where('action', '==', filters.action);
  }
  if (filters?.resource) {
    query = query.where('resource', '==', filters.resource);
  }
  if (filters?.tenantId) {
    query = query.where('tenantId', '==', filters.tenantId);
  }
  if (filters?.userId) {
    query = query.where('userId', '==', filters.userId);
  }
  if (filters?.startDate) {
    query = query.where('createdAt', '>=', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.where('createdAt', '<=', filters.endDate);
  }

  query = query.orderBy('createdAt', 'desc');
  
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(1000); // Límite por defecto
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
    } as AuditLog;
  });
}

/**
 * Crea un log de auditoría
 */
export async function createAuditLog(
  log: Omit<AuditLog, 'id' | 'createdAt'>
): Promise<void> {
  await getDb().collection('audit_logs').add({
    ...log,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Helper para loguear acciones comunes
 */
export async function logAction(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  changes?: Record<string, any>,
  tenantId?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    userId,
    action,
    resource,
    resourceId,
    changes,
  });
}


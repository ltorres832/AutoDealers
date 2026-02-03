// Gestión completa de suscripciones con estados, facturación automática y suspensión

import { getFirestore } from '@autodealers/core';
import { Subscription, SubscriptionStatus } from './types';
import * as admin from 'firebase-admin';
import { updateTenant } from '@autodealers/core';

// NO inicializar db aquí - se inicializa en cada función
let db: admin.firestore.Firestore | null = null;

function getDb() {
  if (!db) {
    db = getFirestore();
  }
  return db;
}

/**
 * Obtiene todas las suscripciones con filtros opcionales
 */
export async function getAllSubscriptions(filters?: {
  status?: SubscriptionStatus;
  tenantId?: string;
  membershipId?: string;
}): Promise<Subscription[]> {
  console.log('🔍 [getAllSubscriptions] Buscando suscripciones con filtros:', filters);
  let query: admin.firestore.Query = getDb().collection('subscriptions');

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters?.tenantId) {
    query = query.where('tenantId', '==', filters.tenantId);
    console.log('🔍 [getAllSubscriptions] Filtrando por tenantId:', filters.tenantId);
  }
  if (filters?.membershipId) {
    query = query.where('membershipId', '==', filters.membershipId);
  }

  try {
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    console.log('✅ [getAllSubscriptions] Query exitosa, encontradas:', snapshot.size, 'suscripciones');
    return mapSubscriptionDocs(snapshot.docs);
  } catch (error: any) {
    console.warn('⚠️ [getAllSubscriptions] Error con orderBy, intentando sin ordenar:', error.message);
    // Si falla por índice faltante, obtener sin ordenar
    const snapshot = await query.get();
    console.log('✅ [getAllSubscriptions] Query sin orderBy exitosa, encontradas:', snapshot.size, 'suscripciones');
    const subscriptions = mapSubscriptionDocs(snapshot.docs);
    subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return subscriptions;
  }
}

function mapSubscriptionDocs(docs: admin.firestore.QueryDocumentSnapshot[]): Subscription[] {
  return docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      currentPeriodStart: data?.currentPeriodStart?.toDate() || new Date(),
      currentPeriodEnd: data?.currentPeriodEnd?.toDate() || new Date(),
      lastPaymentDate: data?.lastPaymentDate?.toDate(),
      nextPaymentDate: data?.nextPaymentDate?.toDate(),
      suspendedAt: data?.suspendedAt?.toDate(),
      reactivatedAt: data?.reactivatedAt?.toDate(),
      cancelledAt: data?.cancelledAt?.toDate(),
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Subscription;
  });
}

/**
 * Obtiene una suscripción por ID
 */
export async function getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
  const doc = await getDb().collection('subscriptions').doc(subscriptionId).get();
  
  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    currentPeriodStart: data?.currentPeriodStart?.toDate() || new Date(),
    currentPeriodEnd: data?.currentPeriodEnd?.toDate() || new Date(),
    lastPaymentDate: data?.lastPaymentDate?.toDate(),
    nextPaymentDate: data?.nextPaymentDate?.toDate(),
    suspendedAt: data?.suspendedAt?.toDate(),
    reactivatedAt: data?.reactivatedAt?.toDate(),
    cancelledAt: data?.cancelledAt?.toDate(),
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as Subscription;
}

/**
 * Obtiene la suscripción activa de un tenant
 */
export async function getSubscriptionByTenantId(tenantId: string): Promise<Subscription | null> {
  console.log('🔍 [getSubscriptionByTenantId] Buscando suscripción para tenantId:', tenantId);
  const subscriptions = await getAllSubscriptions({ tenantId });
  
  console.log('🔍 [getSubscriptionByTenantId] Resultado de getAllSubscriptions:', {
    count: subscriptions.length,
    subscriptions: subscriptions.map(s => ({
      id: s.id,
      status: s.status,
      membershipId: s.membershipId,
    })),
  });
  
  // Retornar la más reciente o activa
  if (subscriptions.length === 0) {
    console.log('⚠️ [getSubscriptionByTenantId] No se encontraron suscripciones para tenantId:', tenantId);
    
    // Debug: buscar todas las suscripciones para ver qué hay
    try {
      const allSubs = await getAllSubscriptions();
      console.log('🔍 [getSubscriptionByTenantId] Debug - Total de suscripciones en Firestore:', allSubs.length);
      allSubs.slice(0, 10).forEach((sub, i) => {
        console.log(`  ${i + 1}. ID: ${sub.id}, tenantId: ${sub.tenantId}, status: ${sub.status}, membershipId: ${sub.membershipId}`);
      });
    } catch (debugError: any) {
      console.error('❌ [getSubscriptionByTenantId] Error en debug:', debugError);
    }
    
    return null;
  }
  
  // Priorizar suscripción activa
  const active = subscriptions.find(s => s.status === 'active');
  if (active) {
    console.log('✅ [getSubscriptionByTenantId] Encontrada suscripción activa:', {
      id: active.id,
      status: active.status,
      membershipId: active.membershipId,
    });
    return active;
  }
  
  // Si no hay activa, retornar la más reciente
  const latest = subscriptions[0];
  console.log('✅ [getSubscriptionByTenantId] Retornando suscripción más reciente:', {
    id: latest.id,
    status: latest.status,
    membershipId: latest.membershipId,
  });
  return latest;
}

/**
 * Actualiza el estado de una suscripción
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  additionalData?: {
    daysPastDue?: number;
    suspendedAt?: Date;
    reactivatedAt?: Date;
    lastPaymentDate?: Date;
    nextPaymentDate?: Date;
    statusReason?: string;
  }
): Promise<void> {
  const updates: any = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (additionalData) {
    if (additionalData.daysPastDue !== undefined) {
      updates.daysPastDue = additionalData.daysPastDue;
    }
    if (additionalData.suspendedAt) {
      updates.suspendedAt = admin.firestore.Timestamp.fromDate(additionalData.suspendedAt);
    }
    if (additionalData.reactivatedAt) {
      updates.reactivatedAt = admin.firestore.Timestamp.fromDate(additionalData.reactivatedAt);
    }
    if (additionalData.lastPaymentDate) {
      updates.lastPaymentDate = admin.firestore.Timestamp.fromDate(additionalData.lastPaymentDate);
    }
    if (additionalData.nextPaymentDate) {
      updates.nextPaymentDate = admin.firestore.Timestamp.fromDate(additionalData.nextPaymentDate);
    }
    if (additionalData.statusReason) {
      updates.statusReason = additionalData.statusReason;
    }
  }

  await getDb().collection('subscriptions').doc(subscriptionId).update(updates);
}

/**
 * Suspende una cuenta automáticamente por falta de pago
 */
export async function suspendAccountForNonPayment(subscriptionId: string): Promise<void> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Actualizar estado de suscripción
  await updateSubscriptionStatus(subscriptionId, 'suspended', {
    suspendedAt: new Date(),
    daysPastDue: subscription.daysPastDue || 0,
    statusReason: 'Suspensión por falta de pago',
  });

  // Actualizar estado del tenant
  await updateTenant(subscription.tenantId, {
    status: 'suspended',
  });

  console.log(`Account ${subscription.tenantId} suspended for non-payment`);
}

/**
 * Reactiva una cuenta después de un pago exitoso
 */
export async function reactivateAccountAfterPayment(subscriptionId: string): Promise<void> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Actualizar estado de suscripción
  await updateSubscriptionStatus(subscriptionId, 'active', {
    reactivatedAt: new Date(),
    lastPaymentDate: new Date(),
    statusReason: 'Reactivación después de pago exitoso',
  });

  // Actualizar estado del tenant
  await updateTenant(subscription.tenantId, {
    status: 'active',
  });

  console.log(`Account ${subscription.tenantId} reactivated after payment`);
}

/**
 * Cambia la membresía de una suscripción
 */
export async function changeMembership(
  subscriptionId: string,
  newMembershipId: string,
  newPriceId: string
): Promise<void> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Actualizar suscripción en Firestore
  await getDb().collection('subscriptions').doc(subscriptionId).update({
    membershipId: newMembershipId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    // El cambio real en Stripe se hace desde el frontend o webhook
  });

  // Actualizar el tenant con la nueva membresía (si tiene el campo)
  try {
    const tenantRef = getDb().collection('tenants').doc(subscription.tenantId);
    const tenantDoc = await tenantRef.get();
    if (tenantDoc.exists) {
      await tenantRef.update({
        membershipId: newMembershipId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('Could not update tenant membershipId:', error);
  }

  // Actualizar membershipId en todos los usuarios del tenant
  const usersSnapshot = await (db || getDb())
    .collection('users')
    .where('tenantId', '==', subscription.tenantId)
    .get();
  const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  
  for (const user of users) {
    await getDb().collection('users').doc(user.id).update({
      membershipId: newMembershipId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log(`Membership changed for subscription ${subscriptionId} to ${newMembershipId}`);
  console.log(`Updated ${users.length} users and tenant ${subscription.tenantId}`);
}

/**
 * Obtiene estadísticas de suscripciones
 */
export async function getSubscriptionStats(): Promise<{
  total: number;
  active: number;
  suspended: number;
  cancelled: number;
  pastDue: number;
}> {
  const allSubscriptions = await getAllSubscriptions();
  
  return {
    total: allSubscriptions.length,
    active: allSubscriptions.filter(s => s.status === 'active').length,
    suspended: allSubscriptions.filter(s => s.status === 'suspended').length,
    cancelled: allSubscriptions.filter(s => s.status === 'cancelled').length,
    pastDue: allSubscriptions.filter(s => s.status === 'past_due').length,
  };
}


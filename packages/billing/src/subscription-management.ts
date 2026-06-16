// Gestión completa de suscripciones con estados, facturación automática y suspensión

import { getFirestore } from '@autodealers/shared';
import { Subscription, SubscriptionStatus } from './types';
import * as admin from 'firebase-admin';
import { updateTenant } from '@autodealers/core';
import { checkAndSuspendEmailsOnSubscriptionChange, reactivateTenantCorporateEmails } from './email-suspension';
import { updateStripeSubscriptionPrice } from './stripe-membership-sync';

// NO inicializar db aquí - se inicializa en cada función
let db: admin.firestore.Firestore | null = null;

function getDb(): admin.firestore.Firestore {
  if (!db) {
    db = getFirestore();
  }
  return db!;
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

function readFirestoreDate(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null) {
    const ts = value as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof ts.toDate === 'function') {
      try {
        return ts.toDate();
      } catch {
        return undefined;
      }
    }
    const seconds = ts._seconds ?? ts.seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function mapSubscriptionDocs(docs: admin.firestore.QueryDocumentSnapshot[]): Subscription[] {
  return docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      currentPeriodStart: readFirestoreDate(data?.currentPeriodStart) || new Date(),
      currentPeriodEnd: readFirestoreDate(data?.currentPeriodEnd) || new Date(),
      lastPaymentDate: readFirestoreDate(data?.lastPaymentDate),
      nextPaymentDate: readFirestoreDate(data?.nextPaymentDate),
      suspendedAt: readFirestoreDate(data?.suspendedAt),
      reactivatedAt: readFirestoreDate(data?.reactivatedAt),
      cancelledAt: readFirestoreDate(data?.cancelledAt),
      createdAt: readFirestoreDate(data?.createdAt) || new Date(),
      updatedAt: readFirestoreDate(data?.updatedAt) || new Date(),
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
 * Suspende una cuenta automáticamente por falta de pago (tenant, usuarios y emails corporativos).
 */
export async function suspendAccountForNonPayment(
  subscriptionId: string,
  reason = 'Suspensión por falta de pago'
): Promise<void> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  await updateSubscriptionStatus(subscriptionId, 'suspended', {
    suspendedAt: new Date(),
    daysPastDue: subscription.daysPastDue || 0,
    statusReason: reason,
  });

  await updateTenant(subscription.tenantId, {
    status: 'suspended',
  });

  const usersSnapshot = await getDb()
    .collection('users')
    .where('tenantId', '==', subscription.tenantId)
    .get();

  if (!usersSnapshot.empty) {
    const batch = getDb().batch();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    for (const userDoc of usersSnapshot.docs) {
      batch.update(userDoc.ref, {
        status: 'suspended',
        updatedAt: ts,
      });
    }
    await batch.commit();
  }

  await checkAndSuspendEmailsOnSubscriptionChange(subscriptionId, 'suspended');

  console.log(`Account ${subscription.tenantId} suspended for non-payment (${reason})`);
}

/**
 * Reactiva una cuenta después de un pago exitoso
 */
export async function reactivateAccountAfterPayment(subscriptionId: string): Promise<void> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const periodEnd = subscription.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await updateSubscriptionStatus(subscriptionId, 'active', {
    reactivatedAt: new Date(),
    lastPaymentDate: new Date(),
    nextPaymentDate: periodEnd,
    daysPastDue: 0,
    statusReason: 'Reactivación después de pago exitoso',
  });

  await updateTenant(subscription.tenantId, {
    status: 'active',
  });

  const usersSnapshot = await getDb()
    .collection('users')
    .where('tenantId', '==', subscription.tenantId)
    .get();

  if (!usersSnapshot.empty) {
    const batch = getDb().batch();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data();
      if (data.status === 'suspended' || data.status === 'cancelled') {
        batch.update(userDoc.ref, {
          status: 'active',
          updatedAt: ts,
        });
      }
    }
    await batch.commit();
  }

  await checkAndSuspendEmailsOnSubscriptionChange(subscriptionId, 'active');
  await reactivateTenantCorporateEmails(subscription.tenantId);

  console.log(`Account ${subscription.tenantId} reactivated after payment`);
}

/** Sincroniza membershipId en suscripción, tenant y usuarios (sin tocar Stripe). */
export async function syncMembershipForSubscription(
  subscriptionId: string,
  membershipId: string
): Promise<void> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  await getDb().collection('subscriptions').doc(subscriptionId).update({
    membershipId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    const tenantRef = getDb().collection('tenants').doc(subscription.tenantId);
    const tenantDoc = await tenantRef.get();
    if (tenantDoc.exists) {
      await tenantRef.update({
        membershipId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('Could not update tenant membershipId:', error);
  }

  const usersSnapshot = await getDb()
    .collection('users')
    .where('tenantId', '==', subscription.tenantId)
    .get();

  for (const userDoc of usersSnapshot.docs) {
    await userDoc.ref.update({
      membershipId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log(
    `Membership synced for subscription ${subscriptionId} → ${membershipId} (${usersSnapshot.size} users)`
  );
}

/**
 * Cambia la membresía de una suscripción
 */
export async function changeMembership(
  subscriptionId: string,
  newMembershipId: string,
  newPriceId: string,
  options?: { skipStripeUpdate?: boolean }
): Promise<void> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (
    !options?.skipStripeUpdate &&
    subscription.stripeSubscriptionId?.trim() &&
    newPriceId?.trim()
  ) {
    await updateStripeSubscriptionPrice(
      subscription.stripeSubscriptionId,
      newPriceId,
      newMembershipId
    );
  }

  await syncMembershipForSubscription(subscriptionId, newMembershipId);
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


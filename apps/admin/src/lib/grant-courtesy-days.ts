import { getFirestore, getStripeInstance } from '@autodealers/core';
import {
  getSubscriptionByTenantId,
  isHardBlockedSubscriptionStatus,
} from '@autodealers/billing';
import * as admin from 'firebase-admin';

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value && 'toDate' in value) {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function grantCourtesyDays(params: {
  tenantId?: string;
  userId?: string;
  days: number;
  adminUserId: string;
}): Promise<{
  tenantId: string;
  tenantName: string;
  tenantType: string;
  days: number;
  newPeriodEnd: string;
  stripeUpdated: boolean;
  stripeError?: string;
  createdSubscription: boolean;
}> {
  const days = Math.floor(Number(params.days));
  if (!Number.isFinite(days) || days < 1) {
    throw Object.assign(new Error('Indica un número de días mayor que 0.'), { status: 400 });
  }
  if (days > 365) {
    throw Object.assign(new Error('El máximo es 365 días de cortesía.'), { status: 400 });
  }

  const db = getFirestore();
  let tenantId = String(params.tenantId || '').trim();

  if (!tenantId && params.userId) {
    const userSnap = await db.collection('users').doc(String(params.userId).trim()).get();
    if (!userSnap.exists) {
      throw Object.assign(new Error('Usuario no encontrado.'), { status: 404 });
    }
    tenantId = String(userSnap.data()?.tenantId || '').trim();
  }

  if (!tenantId) {
    throw Object.assign(new Error('Selecciona un dealer o un vendedor (tenant).'), { status: 400 });
  }

  const tenantSnap = await db.collection('tenants').doc(tenantId).get();
  if (!tenantSnap.exists) {
    throw Object.assign(new Error('El tenant no existe.'), { status: 404 });
  }

  const tenant = tenantSnap.data() || {};
  const tenantType = String(tenant.type || 'seller');
  if (tenantType !== 'dealer' && tenantType !== 'seller') {
    throw Object.assign(new Error('Solo se pueden otorgar días de cortesía a un dealer o un vendedor.'), {
      status: 400,
    });
  }

  const ownerId =
    (typeof tenant.ownerId === 'string' && tenant.ownerId) ||
    String(params.userId || '').trim() ||
    '';

  const existing = await getSubscriptionByTenantId(tenantId);
  const now = new Date();
  const baseCandidates = [now, asDate(existing?.currentPeriodEnd), asDate(existing?.trialEndsAt)].filter(
    (d): d is Date => !!d
  );
  const base = new Date(Math.max(...baseCandidates.map((d) => d.getTime())));
  const newEnd = addDays(base, days);

  let stripeUpdated = false;
  let stripeError: string | undefined;
  const stripeId = String(existing?.stripeSubscriptionId || '').trim();

  if (stripeId) {
    try {
      const stripe = await getStripeInstance();
      await stripe.subscriptions.update(stripeId, {
        trial_end: Math.floor(newEnd.getTime() / 1000),
        proration_behavior: 'none',
        metadata: {
          courtesyDays: String(days),
          courtesyGrantedBy: params.adminUserId,
        },
      });
      stripeUpdated = true;
    } catch (err) {
      stripeError = err instanceof Error ? err.message : 'No se pudo actualizar Stripe';
      console.error('[courtesy-days] Stripe update failed:', err);
    }
  }

  const previousEnd = asDate(existing?.currentPeriodEnd);
  const courtesyDays = (Number((existing as { courtesyDays?: number } | null)?.courtesyDays) || 0) + days;
  const nextStatus =
    !existing ||
    isHardBlockedSubscriptionStatus(existing.status) ||
    existing.status === 'past_due' ||
    stripeUpdated
      ? 'trialing'
      : existing.status === 'active' || existing.status === 'trialing'
        ? existing.status
        : 'trialing';

  const ts = admin.firestore.FieldValue.serverTimestamp();
  const firestoreEnd = admin.firestore.Timestamp.fromDate(newEnd);
  const grantMeta = {
    days,
    grantedAt: ts,
    grantedBy: params.adminUserId,
    previousPeriodEnd: previousEnd ? admin.firestore.Timestamp.fromDate(previousEnd) : null,
  };

  let createdSubscription = false;
  if (existing) {
    await db
      .collection('subscriptions')
      .doc(existing.id)
      .update({
        currentPeriodEnd: firestoreEnd,
        trialEndsAt: firestoreEnd,
        nextPaymentDate: firestoreEnd,
        status: nextStatus,
        daysPastDue: 0,
        cancelAtPeriodEnd: false,
        courtesyDays,
        lastCourtesyGrant: grantMeta,
        updatedAt: ts,
      });
  } else {
    createdSubscription = true;
    await db.collection('subscriptions').doc().set({
      tenantId,
      userId: ownerId,
      membershipId: tenant.membershipId || '',
      status: 'trialing',
      billingSource: 'admin_grant',
      stripeSubscriptionId: '',
      stripeCustomerId: '',
      currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
      currentPeriodEnd: firestoreEnd,
      trialEndsAt: firestoreEnd,
      nextPaymentDate: firestoreEnd,
      cancelAtPeriodEnd: false,
      courtesyDays: days,
      lastCourtesyGrant: grantMeta,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  await tenantSnap.ref.update({
    courtesyUntil: firestoreEnd,
    lastCourtesyDays: days,
    updatedAt: ts,
  });

  return {
    tenantId,
    tenantName: String(tenant.name || tenant.companyName || tenantId),
    tenantType,
    days,
    newPeriodEnd: newEnd.toISOString(),
    stripeUpdated,
    stripeError,
    createdSubscription,
  };
}

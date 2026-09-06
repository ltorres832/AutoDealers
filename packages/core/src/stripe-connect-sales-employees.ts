/**
 * Stripe Connect Express para empleados de ventas. Independiente de afiliados.
 */

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { getStripeInstance } from './stripe-helper';
import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';
import {
  getSalesEmployee,
  isTenantMembershipActive,
  listSalesEmployeeCommissions,
  refreshSalesEmployeeStats,
  SALES_COMMISSIONS_COL,
  SALES_EMPLOYEES_COL,
} from './sales-employees';

function getDb() {
  return getFirestore();
}

export interface SalesEmployeeConnectStatus {
  accountId: string | null;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
}

function emptyConnectStatus(): SalesEmployeeConnectStatus {
  return {
    accountId: null,
    onboardingComplete: false,
    payoutsEnabled: false,
    chargesEnabled: false,
    detailsSubmitted: false,
    requiresAction: true,
  };
}

export async function syncSalesEmployeeConnectAccountFromStripe(
  employeeId: string
): Promise<SalesEmployeeConnectStatus> {
  const employee = await getSalesEmployee(employeeId);
  if (!employee?.stripeConnectAccountId) return emptyConnectStatus();

  const stripe = await getStripeInstance();
  const account = await stripe.accounts.retrieve(employee.stripeConnectAccountId);
  const onboardingComplete = Boolean(account.details_submitted);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const chargesEnabled = Boolean(account.charges_enabled);

  await getDb().collection(SALES_EMPLOYEES_COL).doc(employeeId).update({
    stripeConnectOnboardingComplete: onboardingComplete,
    stripeConnectPayoutsEnabled: payoutsEnabled,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    accountId: employee.stripeConnectAccountId,
    onboardingComplete,
    payoutsEnabled,
    chargesEnabled,
    detailsSubmitted: onboardingComplete,
    requiresAction: !payoutsEnabled || !onboardingComplete,
  };
}

export async function getSalesEmployeeConnectStatus(
  employeeId: string
): Promise<SalesEmployeeConnectStatus> {
  const employee = await getSalesEmployee(employeeId);
  if (!employee?.stripeConnectAccountId) return emptyConnectStatus();
  return syncSalesEmployeeConnectAccountFromStripe(employeeId);
}

export async function ensureSalesEmployeeConnectAccount(employeeId: string): Promise<string> {
  const employee = await getSalesEmployee(employeeId);
  if (!employee) throw new Error('Empleado no encontrado');
  if (employee.stripeConnectAccountId) return employee.stripeConnectAccountId;

  const stripe = await getStripeInstance();
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: employee.email,
    capabilities: { transfers: { requested: true } },
    business_type: 'individual',
    metadata: { salesEmployeeId: employeeId, platform: 'autodealers' },
  });

  await getDb().collection(SALES_EMPLOYEES_COL).doc(employeeId).update({
    stripeConnectAccountId: account.id,
    stripeConnectOnboardingComplete: false,
    stripeConnectPayoutsEnabled: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return account.id;
}

export async function createSalesEmployeeConnectOnboardingLink(
  employeeId: string
): Promise<{ url: string; accountId: string }> {
  const accountId = await ensureSalesEmployeeConnectAccount(employeeId);
  const stripe = await getStripeInstance();
  const base = resolvePublicWebUrl();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/sales/dashboard?connect=refresh`,
    return_url: `${base}/sales/dashboard?connect=return`,
    type: 'account_onboarding',
  });
  if (!link.url) throw new Error('Stripe no devolvió URL de onboarding');
  return { url: link.url, accountId };
}

export async function transferSalesEmployeeCommission(commissionId: string): Promise<string> {
  const commissionRef = getDb().collection(SALES_COMMISSIONS_COL).doc(commissionId);
  const commissionSnap = await commissionRef.get();
  if (!commissionSnap.exists) throw new Error('Comisión no encontrada');

  const commission = commissionSnap.data() || {};
  if (commission.status === 'paid') return String(commission.stripeTransferId || '');
  if (commission.status === 'void_cancelled' || commission.status === 'blocked_inactive') {
    throw new Error('Comisión no pagable');
  }

  const employee = await getSalesEmployee(String(commission.employeeId));
  if (!employee || employee.status !== 'active') {
    await commissionRef.update({
      status: 'blocked_inactive',
      payoutError: 'Empleado inactivo',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    throw new Error('Empleado inactivo');
  }

  if (commission.type === 'membership_second' && commission.tenantId) {
    const clientActive = await isTenantMembershipActive(String(commission.tenantId));
    if (!clientActive) {
      await commissionRef.update({
        status: 'blocked_inactive',
        payoutError: 'Cliente ya no tiene membresía activa',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await refreshSalesEmployeeStats(employee.id);
      throw new Error('Cliente inactivo');
    }
  }

  if (!employee.stripeConnectAccountId) {
    await commissionRef.update({
      status: 'payable',
      payoutError: 'Falta conectar Stripe',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    throw new Error('Empleado sin cuenta Stripe Connect');
  }

  const connect = await syncSalesEmployeeConnectAccountFromStripe(employee.id);
  if (!connect.payoutsEnabled) {
    await commissionRef.update({
      status: 'payable',
      payoutError: 'Stripe Connect: payouts no habilitados',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    throw new Error('Stripe Connect: payouts no habilitados');
  }

  const amountCents = Math.round(Number(commission.amount) * 100);
  if (amountCents < 1) throw new Error('Monto de comisión inválido');

  await commissionRef.update({
    payoutStatus: 'processing',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const stripe = await getStripeInstance();
  const transfer = await stripe.transfers.create(
    {
      amount: amountCents,
      currency: String(commission.currency || 'usd').toLowerCase(),
      destination: employee.stripeConnectAccountId,
      metadata: {
        commissionId,
        salesEmployeeId: employee.id,
        type: String(commission.type || ''),
      },
    },
    { idempotencyKey: `sales-employee-commission-${commissionId}` }
  );

  await commissionRef.update({
    status: 'paid',
    payoutStatus: 'paid',
    stripeTransferId: transfer.id,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    payoutError: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await refreshSalesEmployeeStats(employee.id);
  return transfer.id;
}

export async function processEligibleSalesEmployeePayouts(): Promise<{
  processed: number;
  paid: number;
  deferred: number;
  skipped: number;
  errors: string[];
}> {
  const commissions = await listSalesEmployeeCommissions();
  const now = Date.now();
  let processed = 0;
  let paid = 0;
  let deferred = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const commission of commissions) {
    if (commission.status === 'paid' || commission.status === 'void_cancelled' || commission.status === 'blocked_inactive') {
      skipped += 1;
      continue;
    }
    const eligibleAt = commission.eligibleAt?.getTime() || 0;
    if (eligibleAt > now) {
      skipped += 1;
      continue;
    }

    processed += 1;
    const ref = getDb().collection(SALES_COMMISSIONS_COL).doc(commission.id);
    if (commission.status === 'pending_hold') {
      await ref.update({
        status: 'payable',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    try {
      await transferSalesEmployeeCommission(commission.id);
      paid += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Stripe Connect') || message.includes('sin cuenta')) {
        deferred += 1;
      } else {
        errors.push(`${commission.id}: ${message}`);
      }
    }
  }

  return { processed, paid, deferred, skipped, errors };
}

export async function handleSalesEmployeeConnectAccountUpdated(account: {
  id: string;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
}): Promise<void> {
  const snap = await getDb()
    .collection(SALES_EMPLOYEES_COL)
    .where('stripeConnectAccountId', '==', account.id)
    .limit(1)
    .get();
  if (snap.empty) return;
  await snap.docs[0].ref.update({
    stripeConnectOnboardingComplete: Boolean(account.details_submitted),
    stripeConnectPayoutsEnabled: Boolean(account.payouts_enabled),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function handleSalesEmployeeTransferReversed(transferId: string): Promise<void> {
  const snap = await getDb()
    .collection(SALES_COMMISSIONS_COL)
    .where('stripeTransferId', '==', transferId)
    .limit(1)
    .get();
  if (snap.empty) return;
  const employeeId = String(snap.docs[0].data()?.employeeId || '');
  await snap.docs[0].ref.update({
    status: 'payable',
    payoutStatus: 'failed',
    payoutError: 'Transfer revertido por Stripe',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  if (employeeId) await refreshSalesEmployeeStats(employeeId);
}

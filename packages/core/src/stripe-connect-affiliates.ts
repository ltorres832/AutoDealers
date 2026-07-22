// Stripe Connect Express para pagos automáticos a afiliados

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { getStripeInstance } from './stripe-helper';
import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';
import { getAffiliatePartner, markAffiliateCommissionStripePaid, refreshAffiliateStats } from './affiliates';

function getDb() {
  return getFirestore();
}

export function getAffiliatePortalBaseUrl(): string {
  return resolvePublicWebUrl();
}

export interface AffiliateConnectStatus {
  accountId: string | null;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
}

export async function syncAffiliateConnectAccountFromStripe(
  affiliateId: string
): Promise<AffiliateConnectStatus> {
  const affiliate = await getAffiliatePartner(affiliateId);
  if (!affiliate?.stripeConnectAccountId) {
    return {
      accountId: null,
      onboardingComplete: false,
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      requiresAction: true,
    };
  }

  const stripe = await getStripeInstance();
  const account = await stripe.accounts.retrieve(affiliate.stripeConnectAccountId);

  const onboardingComplete = Boolean(account.details_submitted);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const chargesEnabled = Boolean(account.charges_enabled);

  await getDb()
    .collection('affiliate_partners')
    .doc(affiliateId)
    .update({
      stripeConnectOnboardingComplete: onboardingComplete,
      stripeConnectPayoutsEnabled: payoutsEnabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return {
    accountId: affiliate.stripeConnectAccountId,
    onboardingComplete,
    payoutsEnabled,
    chargesEnabled,
    detailsSubmitted: onboardingComplete,
    requiresAction: !payoutsEnabled || !onboardingComplete,
  };
}

export async function getAffiliateConnectStatus(
  affiliateId: string
): Promise<AffiliateConnectStatus> {
  const affiliate = await getAffiliatePartner(affiliateId);
  if (!affiliate?.stripeConnectAccountId) {
    return {
      accountId: null,
      onboardingComplete: false,
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      requiresAction: true,
    };
  }

  return syncAffiliateConnectAccountFromStripe(affiliateId);
}

export async function ensureAffiliateConnectAccount(affiliateId: string): Promise<string> {
  const affiliate = await getAffiliatePartner(affiliateId);
  if (!affiliate) throw new Error('Afiliado no encontrado');

  if (affiliate.stripeConnectAccountId) {
    return affiliate.stripeConnectAccountId;
  }

  const stripe = await getStripeInstance();
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: affiliate.email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      affiliateId,
      platform: 'autodealers',
    },
  });

  await getDb().collection('affiliate_partners').doc(affiliateId).update({
    stripeConnectAccountId: account.id,
    stripeConnectOnboardingComplete: false,
    stripeConnectPayoutsEnabled: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return account.id;
}

export async function createAffiliateConnectOnboardingLink(
  affiliateId: string
): Promise<{ url: string; accountId: string }> {
  const accountId = await ensureAffiliateConnectAccount(affiliateId);
  const stripe = await getStripeInstance();
  const base = getAffiliatePortalBaseUrl();

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/affiliate/dashboard?connect=refresh`,
    return_url: `${base}/affiliate/dashboard?connect=return`,
    type: 'account_onboarding',
  });

  if (!link.url) throw new Error('Stripe no devolvió URL de onboarding');

  return { url: link.url, accountId };
}

export async function transferAffiliateCommission(commissionId: string): Promise<string> {
  const commissionRef = getDb().collection('affiliate_commissions').doc(commissionId);
  const commissionSnap = await commissionRef.get();
  if (!commissionSnap.exists) throw new Error('Comisión no encontrada');

  const commission = commissionSnap.data() || {};
  if (commission.status === 'paid') {
    return String(commission.stripeTransferId || '');
  }
  if (commission.status === 'cancelled') {
    throw new Error('Comisión cancelada');
  }

  const affiliate = await getAffiliatePartner(String(commission.affiliateId));
  if (!affiliate?.stripeConnectAccountId) {
    throw new Error('Afiliado sin cuenta Stripe Connect');
  }

  await syncAffiliateConnectAccountFromStripe(affiliate.id);
  const refreshed = await getAffiliatePartner(affiliate.id);
  if (!refreshed?.stripeConnectPayoutsEnabled) {
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
      destination: refreshed.stripeConnectAccountId!,
      metadata: {
        commissionId,
        affiliateId: affiliate.id,
        referralId: String(commission.referralId || ''),
        referredEmail: String(commission.referredEmail || ''),
      },
    },
    { idempotencyKey: `affiliate-commission-${commissionId}` }
  );

  await markAffiliateCommissionStripePaid(commissionId, transfer.id);
  return transfer.id;
}

export async function handleConnectAccountUpdated(account: {
  id: string;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
  charges_enabled?: boolean;
}): Promise<void> {
  const snap = await getDb()
    .collection('affiliate_partners')
    .where('stripeConnectAccountId', '==', account.id)
    .limit(1)
    .get();

  if (snap.empty) return;

  const affiliateId = snap.docs[0].id;
  await getDb().collection('affiliate_partners').doc(affiliateId).update({
    stripeConnectOnboardingComplete: Boolean(account.details_submitted),
    stripeConnectPayoutsEnabled: Boolean(account.payouts_enabled),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function handleTransferReversed(transferId: string): Promise<void> {
  const snap = await getDb()
    .collection('affiliate_commissions')
    .where('stripeTransferId', '==', transferId)
    .limit(1)
    .get();

  if (snap.empty) return;

  await snap.docs[0].ref.update({
    status: 'approved',
    payoutStatus: 'failed',
    payoutError: 'Transfer revertido por Stripe',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const affiliateId = snap.docs[0].data()?.affiliateId;
  if (affiliateId) await refreshAffiliateStats(String(affiliateId));
}

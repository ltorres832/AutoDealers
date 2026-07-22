// Afiliados externos: referidores que reciben comisión en efectivo por dealer/seller

import { getFirestore, getAuth } from '@autodealers/shared';
import { buildPublicWebUrl } from '@autodealers/shared/platform-urls';
import * as admin from 'firebase-admin';
import { normalizeLoginEmail } from './user-auth-sync';
import {
  ensureAuthAccount,
  storeAppPasswordForProfile,
} from './platform-registration';

function getDb() {
  return getFirestore();
}

function getAuthInstance() {
  return getAuth();
}

function generateTempPassword(): string {
  return `${Math.random().toString(36).slice(-10)}A1!`;
}

export interface AffiliateCommissionConfig {
  seller: number;
  /** Comisión cuando el dealer referido contrata plan básico */
  dealerBasic: number;
  /** Comisión cuando el dealer referido contrata plan profesional, premium u otro */
  dealerOther: number;
  /** @deprecated Migración: equivale a dealerOther */
  dealer?: number;
  currency: string;
}

export interface AffiliatePayoutProfile {
  method: 'zelle' | 'bank_transfer' | 'paypal' | 'other';
  accountHolder?: string;
  zelleEmail?: string;
  zellePhone?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  accountType?: 'checking' | 'savings';
  paypalEmail?: string;
  otherDetails?: string;
  updatedAt?: admin.firestore.Timestamp;
}

export interface AffiliatePartner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
  commissionSeller?: number;
  commissionDealerBasic?: number;
  commissionDealerOther?: number;
  /** @deprecated Override para dealerOther */
  commissionDealer?: number;
  /** @deprecated Usar payoutProfile — conservado para admin legacy */
  paymentMethod?: string;
  /** @deprecated Usar payoutProfile */
  paymentNotes?: string;
  payoutProfile?: AffiliatePayoutProfile;
  payoutProfileConfigured?: boolean;
  stripeConnectAccountId?: string;
  stripeConnectOnboardingComplete?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  status: 'active' | 'inactive';
  authUserId?: string;
  portalEnabled?: boolean;
  selfRegistered?: boolean;
  stats?: {
    totalReferred: number;
    totalCommissions: number;
    pendingPayout: number;
    totalPaid: number;
  };
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface AffiliateCommission {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  referralId: string;
  referredId: string;
  referredEmail: string;
  referralCode: string;
  userType: 'dealer' | 'seller';
  /** basic | other — solo aplica si userType es dealer */
  dealerPlanTier?: 'basic' | 'other';
  amount: number;
  currency: string;
  status: 'approved' | 'paid' | 'cancelled';
  payoutStatus?: 'pending' | 'processing' | 'deferred' | 'failed' | 'paid';
  eligibleAt?: admin.firestore.Timestamp;
  firstInvoiceId?: string;
  firstChargeAmount?: number;
  stripeTransferId?: string;
  payoutError?: string;
  approvedAt: admin.firestore.Timestamp;
  paidAt?: admin.firestore.Timestamp;
  paidBy?: string;
  paymentReference?: string;
  paymentNotes?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export type ReferrerResolution = {
  id: string;
  type: 'user' | 'affiliate';
};

const DEFAULT_COMMISSION_CONFIG: AffiliateCommissionConfig = {
  seller: 50,
  dealerBasic: 100,
  dealerOther: 200,
  currency: 'USD',
};

function normalizeAffiliateCommissionConfig(
  data: Record<string, unknown> | undefined
): AffiliateCommissionConfig {
  const dealerOther =
    Number(data?.dealerOther) ||
    Number(data?.dealer) ||
    DEFAULT_COMMISSION_CONFIG.dealerOther;
  const dealerBasic =
    data?.dealerBasic !== undefined && data?.dealerBasic !== null && data?.dealerBasic !== ''
      ? Number(data.dealerBasic)
      : DEFAULT_COMMISSION_CONFIG.dealerBasic;

  return {
    seller: Number(data?.seller) || DEFAULT_COMMISSION_CONFIG.seller,
    dealerBasic: Math.max(0, dealerBasic),
    dealerOther: Math.max(0, dealerOther),
    currency: String(data?.currency || DEFAULT_COMMISSION_CONFIG.currency),
  };
}

const PAYOUT_METHOD_LABELS: Record<AffiliatePayoutProfile['method'], string> = {
  zelle: 'Zelle',
  bank_transfer: 'Transferencia bancaria',
  paypal: 'PayPal',
  other: 'Otro',
};

export function validateAffiliatePayoutProfile(
  profile: Partial<AffiliatePayoutProfile>
): AffiliatePayoutProfile {
  const method = profile.method;
  if (!method || !PAYOUT_METHOD_LABELS[method]) {
    throw new Error('Selecciona un método de pago válido');
  }

  const accountHolder = String(profile.accountHolder || '').trim();

  if (method === 'zelle') {
    const zelleEmail = String(profile.zelleEmail || '').trim();
    const zellePhone = String(profile.zellePhone || '').trim();
    if (!zelleEmail && !zellePhone) {
      throw new Error('Indica el email o teléfono de Zelle');
    }
    return {
      method,
      accountHolder: accountHolder || undefined,
      zelleEmail: zelleEmail || undefined,
      zellePhone: zellePhone || undefined,
    };
  }

  if (method === 'bank_transfer') {
    if (!accountHolder) throw new Error('Indica el titular de la cuenta');
    const bankName = String(profile.bankName || '').trim();
    const routingNumber = String(profile.routingNumber || '').trim();
    const accountNumber = String(profile.accountNumber || '').trim();
    const accountType = profile.accountType;
    if (!bankName) throw new Error('Indica el nombre del banco');
    if (!routingNumber) throw new Error('Indica el número de ruta');
    if (!accountNumber) throw new Error('Indica el número de cuenta');
    if (accountType !== 'checking' && accountType !== 'savings') {
      throw new Error('Selecciona tipo de cuenta');
    }
    return {
      method,
      accountHolder,
      bankName,
      routingNumber,
      accountNumber,
      accountType,
    };
  }

  if (method === 'paypal') {
    const paypalEmail = String(profile.paypalEmail || '').trim().toLowerCase();
    if (!paypalEmail) throw new Error('Indica tu email de PayPal');
    return {
      method,
      accountHolder: accountHolder || undefined,
      paypalEmail,
    };
  }

  const otherDetails = String(profile.otherDetails || '').trim();
  if (!otherDetails) throw new Error('Describe cómo deseas recibir tus comisiones');
  return {
    method: 'other',
    accountHolder: accountHolder || undefined,
    otherDetails,
  };
}

export function formatAffiliatePayoutProfileSummary(
  profile?: AffiliatePayoutProfile | null
): string {
  if (!profile?.method) return 'Sin método de pago configurado';

  switch (profile.method) {
    case 'zelle': {
      const parts = [
        profile.accountHolder ? `Titular: ${profile.accountHolder}` : null,
        profile.zelleEmail ? `Email: ${profile.zelleEmail}` : null,
        profile.zellePhone ? `Tel: ${profile.zellePhone}` : null,
      ].filter(Boolean);
      return `Zelle — ${parts.join(' · ') || 'Sin datos'}`;
    }
    case 'bank_transfer': {
      const last4 = profile.accountNumber?.slice(-4);
      return [
        'Transferencia bancaria',
        profile.bankName,
        profile.accountHolder,
        profile.accountType === 'savings' ? 'Ahorros' : 'Corriente',
        last4 ? `Cuenta ****${last4}` : null,
        profile.routingNumber ? `Ruta ${profile.routingNumber}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'paypal':
      return `PayPal — ${profile.paypalEmail || 'Sin email'}`;
    case 'other':
      return profile.otherDetails || 'Otro método';
    default:
      return 'Sin método de pago configurado';
  }
}

export function maskAffiliatePayoutProfile(
  profile?: AffiliatePayoutProfile | null
): AffiliatePayoutProfile | null {
  if (!profile?.method) return null;
  const masked = { ...profile };
  if (masked.accountNumber && masked.accountNumber.length > 4) {
    masked.accountNumber = `****${masked.accountNumber.slice(-4)}`;
  }
  if (masked.routingNumber && masked.routingNumber.length > 4) {
    masked.routingNumber = `****${masked.routingNumber.slice(-4)}`;
  }
  return masked;
}

export async function updateAffiliatePayoutProfile(
  affiliateId: string,
  input: Partial<AffiliatePayoutProfile>
): Promise<AffiliatePayoutProfile> {
  const existing = await getAffiliatePayoutProfile(affiliateId);
  const merged = { ...input };

  if (merged.method === 'bank_transfer' || (!merged.method && existing?.method === 'bank_transfer')) {
    const accountNumber = String(merged.accountNumber || '');
    const routingNumber = String(merged.routingNumber || '');
    if (accountNumber.startsWith('****') && existing?.accountNumber) {
      merged.accountNumber = existing.accountNumber;
    }
    if (routingNumber.startsWith('****') && existing?.routingNumber) {
      merged.routingNumber = existing.routingNumber;
    }
  }

  const profile = validateAffiliatePayoutProfile({
    method: merged.method || existing?.method,
    accountHolder: merged.accountHolder ?? existing?.accountHolder,
    zelleEmail: merged.zelleEmail ?? existing?.zelleEmail,
    zellePhone: merged.zellePhone ?? existing?.zellePhone,
    bankName: merged.bankName ?? existing?.bankName,
    routingNumber: merged.routingNumber ?? existing?.routingNumber,
    accountNumber: merged.accountNumber ?? existing?.accountNumber,
    accountType: merged.accountType ?? existing?.accountType,
    paypalEmail: merged.paypalEmail ?? existing?.paypalEmail,
    otherDetails: merged.otherDetails ?? existing?.otherDetails,
  });
  const summary = formatAffiliatePayoutProfileSummary(profile);

  await getDb()
    .collection('affiliate_partners')
    .doc(affiliateId)
    .update({
      payoutProfile: {
        ...profile,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      payoutProfileConfigured: true,
      paymentMethod: PAYOUT_METHOD_LABELS[profile.method],
      paymentNotes: summary,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return profile;
}

export async function getAffiliatePayoutProfile(
  affiliateId: string
): Promise<AffiliatePayoutProfile | null> {
  const affiliate = await getAffiliatePartner(affiliateId);
  return affiliate?.payoutProfile ?? null;
}

async function referralCodeExists(code: string): Promise<boolean> {
  const [usersSnap, affiliatesSnap] = await Promise.all([
    getDb().collection('users').where('referralCode', '==', code).limit(1).get(),
    getDb().collection('affiliate_partners').where('referralCode', '==', code).limit(1).get(),
  ]);
  return !usersSnap.empty || !affiliatesSnap.empty;
}

/** Ej: "Juan Pérez" → "JUANPEREZ" */
export function slugifyAffiliateNameForCode(name: string): string {
  const slug = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 24);
  return slug || 'AFILIADO';
}

/** Genera código legible tipo JUAN2026; si existe, JUAN20262, JUAN20263… */
export async function generateAffiliateReferralCodeFromName(name: string): Promise<string> {
  const slug = slugifyAffiliateNameForCode(name);
  const year = new Date().getFullYear();
  let code = `${slug}${year}`;

  if (!(await referralCodeExists(code))) {
    return code;
  }

  for (let suffix = 2; suffix <= 99; suffix++) {
    code = `${slug}${year}${suffix}`;
    if (!(await referralCodeExists(code))) {
      return code;
    }
  }

  return generateUniqueReferralCode('AFF');
}

export async function generateUniqueReferralCode(prefix = 'REF'): Promise<string> {
  let code = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 12) {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    code = `${prefix}-${randomPart}`;
    exists = await referralCodeExists(code);
    attempts++;
  }

  if (exists || !code) {
    code = `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  return code;
}

/**
 * Resuelve un código de referido a usuario de plataforma o afiliado externo.
 */
export async function resolveReferrerByCode(code: string): Promise<ReferrerResolution | null> {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;

  const userSnap = await getDb()
    .collection('users')
    .where('referralCode', '==', normalized)
    .limit(1)
    .get();

  if (!userSnap.empty) {
    return { id: userSnap.docs[0].id, type: 'user' };
  }

  const affiliateSnap = await getDb()
    .collection('affiliate_partners')
    .where('referralCode', '==', normalized)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!affiliateSnap.empty) {
    return { id: affiliateSnap.docs[0].id, type: 'affiliate' };
  }

  return null;
}

/** Compatibilidad: devuelve solo el ID del referidor (usuario o afiliado). */
export async function getReferrerIdByCode(code: string): Promise<string | null> {
  const resolved = await resolveReferrerByCode(code);
  return resolved?.id ?? null;
}

export async function getAffiliateCommissionConfig(): Promise<AffiliateCommissionConfig> {
  try {
    const doc = await getDb().collection('system_config').doc('affiliate_commissions').get();
    if (doc.exists) {
      return normalizeAffiliateCommissionConfig(doc.data());
    }
  } catch (err) {
    console.error('getAffiliateCommissionConfig error:', err);
  }

  await getDb()
    .collection('system_config')
    .doc('affiliate_commissions')
    .set({
      ...DEFAULT_COMMISSION_CONFIG,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return DEFAULT_COMMISSION_CONFIG;
}

export async function updateAffiliateCommissionConfig(
  config: AffiliateCommissionConfig
): Promise<void> {
  const normalized = normalizeAffiliateCommissionConfig(config as unknown as Record<string, unknown>);
  await getDb()
    .collection('system_config')
    .doc('affiliate_commissions')
    .set(
      {
        seller: normalized.seller,
        dealerBasic: normalized.dealerBasic,
        dealerOther: normalized.dealerOther,
        dealer: normalized.dealerOther,
        currency: normalized.currency || 'USD',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

export type DealerAffiliateCommissionTier = 'basic' | 'other';

export async function resolveDealerAffiliateCommissionTier(input: {
  referralMembershipType?: string | null;
  referredUserId: string;
  stripeSubscriptionId?: string;
}): Promise<DealerAffiliateCommissionTier> {
  const { resolveReferralMembershipTier } = await import('./referrals');

  const stored = String(input.referralMembershipType || '').toLowerCase();
  if (stored === 'basic') return 'basic';
  if (stored === 'professional' || stored === 'premium') return 'other';

  let membershipId: string | undefined;

  if (input.stripeSubscriptionId) {
    const subSnap = await getDb()
      .collection('subscriptions')
      .where('stripeSubscriptionId', '==', input.stripeSubscriptionId)
      .limit(1)
      .get();
    if (!subSnap.empty) {
      membershipId = String(subSnap.docs[0].data()?.membershipId || '').trim() || undefined;
    }
  }

  if (!membershipId) {
    const userDoc = await getDb().collection('users').doc(input.referredUserId).get();
    const tenantId = String(userDoc.data()?.tenantId || userDoc.data()?.primaryTenantId || '').trim();
    if (tenantId) {
      const subSnap = await getDb()
        .collection('subscriptions')
        .where('tenantId', '==', tenantId)
        .limit(5)
        .get();
      const active = subSnap.docs.find((d) => {
        const s = String(d.data()?.status || '');
        return s === 'active' || s === 'trialing';
      });
      membershipId = String((active || subSnap.docs[0])?.data()?.membershipId || '').trim() || undefined;
    }
  }

  if (membershipId) {
    const membershipDoc = await getDb().collection('memberships').doc(membershipId).get();
    if (membershipDoc.exists) {
      const tier = resolveReferralMembershipTier(membershipDoc.data() || {});
      return tier === 'basic' ? 'basic' : 'other';
    }
  }

  return 'other';
}

export async function resolveAffiliateCommissionAmount(
  affiliateId: string,
  userType: 'dealer' | 'seller',
  opts?: { dealerPlanTier?: DealerAffiliateCommissionTier }
): Promise<{ amount: number; currency: string; dealerPlanTier?: DealerAffiliateCommissionTier }> {
  const config = await getAffiliateCommissionConfig();
  const affiliateDoc = await getDb().collection('affiliate_partners').doc(affiliateId).get();

  if (!affiliateDoc.exists) {
    throw new Error('Afiliado no encontrado');
  }

  const affiliate = affiliateDoc.data() || {};

  if (userType === 'seller') {
    const override = affiliate.commissionSeller;
    const amount =
      override !== undefined && override !== null && override !== ''
        ? Number(override)
        : config.seller;
    return { amount: Math.max(0, amount), currency: config.currency };
  }

  const tier: DealerAffiliateCommissionTier = opts?.dealerPlanTier || 'other';
  const overrideBasic = affiliate.commissionDealerBasic;
  const overrideOther = affiliate.commissionDealerOther ?? affiliate.commissionDealer;

  const amount =
    tier === 'basic'
      ? overrideBasic !== undefined && overrideBasic !== null && overrideBasic !== ''
        ? Number(overrideBasic)
        : config.dealerBasic
      : overrideOther !== undefined && overrideOther !== null && overrideOther !== ''
        ? Number(overrideOther)
        : config.dealerOther;

  return {
    amount: Math.max(0, amount),
    currency: config.currency,
    dealerPlanTier: tier,
  };
}

export async function createAffiliatePartner(input: {
  name: string;
  email: string;
  phone?: string;
  commissionSeller?: number;
  commissionDealerBasic?: number;
  commissionDealerOther?: number;
  commissionDealer?: number;
  paymentMethod?: string;
  paymentNotes?: string;
  referralCode?: string;
  password?: string;
  skipPortal?: boolean;
  selfRegistered?: boolean;
}): Promise<AffiliatePartner & { temporaryPassword?: string }> {
  const name = String(input.name || '').trim();
  const email = normalizeLoginEmail(String(input.email || ''));

  if (!name || !email) {
    throw new Error('Nombre y email son requeridos');
  }

  const existingEmail = await getAffiliateByEmail(email);
  if (existingEmail) {
    throw new Error('Ya tienes una cuenta de afiliado con este correo. Inicia sesión en el portal de afiliados.');
  }

  let referralCode = String(input.referralCode || '').trim().toUpperCase();
  if (referralCode) {
    if (await referralCodeExists(referralCode)) {
      throw new Error('El código de referido ya está en uso');
    }
  } else {
    referralCode = await generateAffiliateReferralCodeFromName(name);
  }

  const now = admin.firestore.Timestamp.now();
  let authUserId: string | undefined;
  let temporaryPassword: string | undefined;
  let affiliateDocId: string;

  if (!input.skipPortal) {
    const tempPassword = input.password?.trim() || generateTempPassword();
    if (tempPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const { authUserId: authUid, created } = await ensureAuthAccount({
      email,
      password: tempPassword,
      displayName: name,
    });

    authUserId = authUid;
    affiliateDocId = created ? authUserId : getDb().collection('affiliate_partners').doc().id;
    temporaryPassword = input.password ? undefined : tempPassword;

    await storeAppPasswordForProfile({
      appKey: 'affiliate',
      email,
      profileId: affiliateDocId,
      authUserId: authUid,
      password: tempPassword,
    });
  } else {
    affiliateDocId = getDb().collection('affiliate_partners').doc().id;
  }

  const data: Omit<AffiliatePartner, 'id'> = {
    name,
    email,
    phone: input.phone?.trim() || undefined,
    referralCode,
    commissionSeller:
      input.commissionSeller !== undefined ? Number(input.commissionSeller) : undefined,
    commissionDealerBasic:
      input.commissionDealerBasic !== undefined ? Number(input.commissionDealerBasic) : undefined,
    commissionDealerOther:
      input.commissionDealerOther !== undefined
        ? Number(input.commissionDealerOther)
        : input.commissionDealer !== undefined
          ? Number(input.commissionDealer)
          : undefined,
    commissionDealer:
      input.commissionDealer !== undefined ? Number(input.commissionDealer) : undefined,
    paymentMethod: input.paymentMethod?.trim() || undefined,
    paymentNotes: input.paymentNotes?.trim() || undefined,
    status: 'active',
    authUserId,
    portalEnabled: !input.skipPortal,
    selfRegistered: input.selfRegistered === true ? true : undefined,
    stats: {
      totalReferred: 0,
      totalCommissions: 0,
      pendingPayout: 0,
      totalPaid: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  await getDb()
    .collection('affiliate_partners')
    .doc(affiliateDocId)
    .set({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  if (authUserId && affiliateDocId === authUserId) {
    await syncAffiliateAuthClaims(affiliateDocId, authUserId);
  }

  return { id: affiliateDocId, ...data, temporaryPassword };
}

export async function updateAffiliatePartner(
  affiliateId: string,
  updates: Partial<{
    name: string;
    email: string;
    phone: string;
    commissionSeller: number | null;
    commissionDealerBasic: number | null;
    commissionDealerOther: number | null;
    commissionDealer: number | null;
    paymentMethod: string;
    paymentNotes: string;
    status: 'active' | 'inactive';
    referralCode: string;
  }>
): Promise<void> {
  const ref = getDb().collection('affiliate_partners').doc(affiliateId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Afiliado no encontrado');
  }

  const patch: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (updates.name !== undefined) patch.name = String(updates.name).trim();
  if (updates.phone !== undefined) patch.phone = updates.phone?.trim() || null;
  if (updates.paymentMethod !== undefined) patch.paymentMethod = updates.paymentMethod?.trim() || null;
  if (updates.paymentNotes !== undefined) patch.paymentNotes = updates.paymentNotes?.trim() || null;
  if (updates.status !== undefined) {
    patch.status = updates.status;
    const affiliate = snap.data() as AffiliatePartner;
    const authUserId = affiliate.authUserId || affiliate.id;
    try {
      await getAuthInstance().updateUser(authUserId, {
        disabled: updates.status !== 'active',
      });
    } catch {
      // Auth user may not exist yet for legacy affiliates
    }
  }

  if (updates.email !== undefined) {
    patch.email = String(updates.email).trim().toLowerCase();
    const affiliate = snap.data() as AffiliatePartner;
    const authUserId = affiliate.authUserId || affiliate.id;
    try {
      await getAuthInstance().updateUser(authUserId, {
        email: String(updates.email).trim().toLowerCase(),
      });
    } catch {
      // ignore if no auth yet
    }
  }

  if (updates.commissionSeller !== undefined) {
    patch.commissionSeller =
      updates.commissionSeller === null ? admin.firestore.FieldValue.delete() : Number(updates.commissionSeller);
  }
  if (updates.commissionDealerBasic !== undefined) {
    patch.commissionDealerBasic =
      updates.commissionDealerBasic === null
        ? admin.firestore.FieldValue.delete()
        : Number(updates.commissionDealerBasic);
  }
  if (updates.commissionDealerOther !== undefined) {
    patch.commissionDealerOther =
      updates.commissionDealerOther === null
        ? admin.firestore.FieldValue.delete()
        : Number(updates.commissionDealerOther);
  }
  if (updates.commissionDealer !== undefined) {
    patch.commissionDealer =
      updates.commissionDealer === null ? admin.firestore.FieldValue.delete() : Number(updates.commissionDealer);
  }

  if (updates.referralCode !== undefined) {
    const code = String(updates.referralCode).trim().toUpperCase();
    if (!code) throw new Error('Código inválido');
    const existing = await resolveReferrerByCode(code);
    if (existing && existing.id !== affiliateId) {
      throw new Error('El código de referido ya está en uso');
    }
    patch.referralCode = code;
  }

  await ref.update(patch);
}

export async function listAffiliatePartners(): Promise<AffiliatePartner[]> {
  const snap = await getDb()
    .collection('affiliate_partners')
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AffiliatePartner);
}

export async function getAffiliatePartner(affiliateId: string): Promise<AffiliatePartner | null> {
  const snap = await getDb().collection('affiliate_partners').doc(affiliateId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as AffiliatePartner;
}

export async function getAffiliateByEmail(email: string): Promise<AffiliatePartner | null> {
  const normalized = normalizeLoginEmail(email);
  const snap = await getDb()
    .collection('affiliate_partners')
    .where('email', '==', normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as AffiliatePartner;
}

export async function getAffiliateByAuthUserId(authUserId: string): Promise<AffiliatePartner | null> {
  const byId = await getAffiliatePartner(authUserId);
  if (byId?.authUserId === authUserId || byId?.id === authUserId) return byId;

  const snap = await getDb()
    .collection('affiliate_partners')
    .where('authUserId', '==', authUserId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as AffiliatePartner;
}

async function syncAffiliateAuthClaims(affiliateId: string, authUserId: string): Promise<void> {
  await getAuthInstance().setCustomUserClaims(authUserId, {
    role: 'affiliate',
    affiliateId,
  });
}

export async function provisionAffiliatePortalAccess(
  affiliateId: string,
  password?: string
): Promise<{ authUserId: string; temporaryPassword?: string }> {
  const affiliate = await getAffiliatePartner(affiliateId);
  if (!affiliate) throw new Error('Afiliado no encontrado');

  const tempPassword = password?.trim() || generateTempPassword();
  if (tempPassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  let authUserId = affiliate.authUserId || affiliate.id;

  try {
    await getAuthInstance().getUser(authUserId);
    await getAuthInstance().updateUser(authUserId, {
      email: affiliate.email,
      password: tempPassword,
      displayName: affiliate.name,
      disabled: affiliate.status !== 'active',
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw err;

    const userRecord = await getAuthInstance().createUser({
      email: affiliate.email,
      password: tempPassword,
      displayName: affiliate.name,
      disabled: affiliate.status !== 'active',
    });
    authUserId = userRecord.uid;
  }

  await syncAffiliateAuthClaims(affiliateId, authUserId);
  await getDb().collection('affiliate_partners').doc(affiliateId).update({
    authUserId,
    portalEnabled: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    authUserId,
    temporaryPassword: password ? undefined : tempPassword,
  };
}

export interface AffiliateDashboardData {
  affiliate: AffiliatePartner;
  referralLink: string;
  commissionConfig: AffiliateCommissionConfig;
  referrals: Array<{
    id: string;
    referredEmail: string;
    userType: 'dealer' | 'seller';
    status: string;
    createdAt: string | null;
    confirmedAt: string | null;
    rewardsGrantedAt: string | null;
  }>;
  payoutProfile: AffiliatePayoutProfile | null;
  payoutProfileConfigured: boolean;
  payoutProfileSummary: string;
  commissions: Array<{
    id: string;
    referredEmail: string;
    userType: 'dealer' | 'seller';
    dealerPlanTier?: 'basic' | 'other';
    amount: number;
    currency: string;
    status: 'approved' | 'paid' | 'cancelled';
    payoutStatus?: string;
    approvedAt: string | null;
    paidAt: string | null;
    paymentReference?: string;
  }>;
  stripeConnect: {
    accountId: string | null;
    onboardingComplete: boolean;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    requiresAction: boolean;
  };
  stats: {
    totalReferred: number;
    pendingReferrals: number;
    confirmedReferrals: number;
    pendingPayout: number;
    totalPaid: number;
    approvedCommissions: number;
    paidCommissions: number;
  };
}

export async function getAffiliateDashboardData(
  affiliateId: string
): Promise<AffiliateDashboardData | null> {
  const affiliate = await getAffiliatePartner(affiliateId);
  if (!affiliate) return null;

  const [referralsSnap, commissions, commissionConfig] = await Promise.all([
    getDb().collection('referrals').where('referrerId', '==', affiliateId).get(),
    listAffiliateCommissions({ affiliateId, limit: 100 }),
    getAffiliateCommissionConfig(),
  ]);

  const { getAffiliateConnectStatus } = await import('./stripe-connect-affiliates');
  const stripeConnect = await getAffiliateConnectStatus(affiliateId);

  const referrals = referralsSnap.docs
    .filter((doc) => doc.data().referrerType === 'affiliate')
    .map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      referredEmail: String(data.referredEmail || ''),
      userType: data.userType as 'dealer' | 'seller',
      status: String(data.status || ''),
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
      confirmedAt: data.confirmedAt?.toDate?.()?.toISOString?.() ?? null,
      rewardsGrantedAt: data.rewardsGrantedAt?.toDate?.()?.toISOString?.() ?? null,
    };
  })
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

  const serializedCommissions = commissions.map((c) => ({
    id: c.id,
    referredEmail: c.referredEmail,
    userType: c.userType,
    dealerPlanTier: c.dealerPlanTier,
    amount: c.amount,
    currency: c.currency,
    status: c.status,
    payoutStatus: c.payoutStatus,
    approvedAt: c.approvedAt?.toDate?.()?.toISOString?.() ?? null,
    paidAt: c.paidAt?.toDate?.()?.toISOString?.() ?? null,
    paymentReference: c.paymentReference,
  }));

  const pendingPayout = serializedCommissions
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = serializedCommissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);

  return {
    affiliate,
    referralLink: buildAffiliateReferralLink(affiliate.referralCode),
    commissionConfig,
    referrals,
    commissions: serializedCommissions,
    payoutProfile: affiliate.payoutProfile ?? null,
    payoutProfileConfigured: affiliate.payoutProfileConfigured === true,
    payoutProfileSummary: formatAffiliatePayoutProfileSummary(affiliate.payoutProfile),
    stripeConnect,
    stats: {
      totalReferred: referrals.length,
      pendingReferrals: referrals.filter((r) => r.status === 'pending' || r.status === 'confirmed').length,
      confirmedReferrals: referrals.filter((r) => r.status === 'rewarded').length,
      pendingPayout,
      totalPaid,
      approvedCommissions: serializedCommissions.filter((c) => c.status === 'approved').length,
      paidCommissions: serializedCommissions.filter((c) => c.status === 'paid').length,
    },
  };
}

export async function refreshAffiliateStats(affiliateId: string): Promise<void> {
  const [referralsSnap, commissionsSnap] = await Promise.all([
    getDb().collection('referrals').where('referrerId', '==', affiliateId).where('referrerType', '==', 'affiliate').get(),
    getDb().collection('affiliate_commissions').where('affiliateId', '==', affiliateId).get(),
  ]);

  let pendingPayout = 0;
  let totalPaid = 0;
  commissionsSnap.docs.forEach((doc) => {
    const c = doc.data();
    const amount = Number(c.amount) || 0;
    if (c.status === 'approved') pendingPayout += amount;
    if (c.status === 'paid') totalPaid += amount;
  });

  await getDb()
    .collection('affiliate_partners')
    .doc(affiliateId)
    .update({
      stats: {
        totalReferred: referralsSnap.size,
        totalCommissions: commissionsSnap.size,
        pendingPayout,
        totalPaid,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Crea comisión cuando Stripe cobra la membresía post-trial (invoice.payment_succeeded).
 */
export async function processAffiliateCommissionOnMembershipCharge(input: {
  userId: string;
  invoiceId: string;
  stripeSubscriptionId: string;
}): Promise<AffiliateCommission | null> {
  const referralSnap = await getDb()
    .collection('referrals')
    .where('referredId', '==', input.userId)
    .where('referrerType', '==', 'affiliate')
    .limit(1)
    .get();

  if (referralSnap.empty) return null;

  const referralDoc = referralSnap.docs[0];
  const referral = { id: referralDoc.id, ...referralDoc.data() } as {
    id: string;
    referrerId: string;
    referredId: string;
    referredEmail: string;
    referralCode: string;
    userType: 'dealer' | 'seller';
    status: string;
    membershipType?: string;
  };

  if (referral.status === 'cancelled') return null;

  const existing = await getDb()
    .collection('affiliate_commissions')
    .where('referralId', '==', referral.id)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { id: existing.docs[0].id, ...existing.docs[0].data() } as AffiliateCommission;
  }

  const { getStripeInstance } = await import('./stripe-helper');
  const stripe = await getStripeInstance();
  const subscription = await stripe.subscriptions.retrieve(input.stripeSubscriptionId);

  if (subscription.status !== 'active') {
    console.log(
      `Affiliate commission skipped: subscription ${input.stripeSubscriptionId} status=${subscription.status}`
    );
    return null;
  }

  const affiliate = await getAffiliatePartner(referral.referrerId);
  if (!affiliate || affiliate.status !== 'active') return null;

  const dealerPlanTier =
    referral.userType === 'dealer'
      ? await resolveDealerAffiliateCommissionTier({
          referralMembershipType: referral.membershipType,
          referredUserId: referral.referredId,
          stripeSubscriptionId: input.stripeSubscriptionId,
        })
      : undefined;

  const { amount, currency, dealerPlanTier: resolvedTier } = await resolveAffiliateCommissionAmount(
    referral.referrerId,
    referral.userType,
    referral.userType === 'dealer' ? { dealerPlanTier: dealerPlanTier! } : undefined
  );

  const now = admin.firestore.Timestamp.now();
  const data: Omit<AffiliateCommission, 'id'> = {
    affiliateId: referral.referrerId,
    affiliateName: affiliate.name,
    affiliateEmail: affiliate.email,
    referralId: referral.id,
    referredId: referral.referredId,
    referredEmail: referral.referredEmail,
    referralCode: referral.referralCode,
    userType: referral.userType,
    dealerPlanTier: referral.userType === 'dealer' ? resolvedTier : undefined,
    amount,
    currency,
    status: 'approved',
    payoutStatus: 'pending',
    eligibleAt: now,
    firstInvoiceId: input.invoiceId,
    firstChargeAmount: amount,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getDb().collection('affiliate_commissions').add({
    ...data,
    eligibleAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await referralDoc.ref.update({
    status: 'rewarded',
    awaitingFirstCharge: false,
    firstMembershipInvoiceId: input.invoiceId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    rewardsGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await refreshAffiliateStats(referral.referrerId);

  console.log(`✅ Affiliate commission created: ${docRef.id} for referral ${referral.id}`);
  return { id: docRef.id, ...data };
}

/**
 * @deprecated Usar processAffiliateCommissionOnMembershipCharge
 */
export async function createAffiliateCommissionForReferral(referral: {
  id: string;
  referrerId: string;
  referredId: string;
  referredEmail: string;
  referralCode: string;
  userType: 'dealer' | 'seller';
  membershipType?: string;
}): Promise<AffiliateCommission> {
  const existing = await getDb()
    .collection('affiliate_commissions')
    .where('referralId', '==', referral.id)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { id: existing.docs[0].id, ...existing.docs[0].data() } as AffiliateCommission;
  }

  const affiliate = await getAffiliatePartner(referral.referrerId);
  if (!affiliate) {
    throw new Error('Afiliado no encontrado');
  }

  const dealerPlanTier =
    referral.userType === 'dealer'
      ? await resolveDealerAffiliateCommissionTier({
          referralMembershipType: referral.membershipType,
          referredUserId: referral.referredId,
        })
      : undefined;

  const { amount, currency, dealerPlanTier: resolvedTier } = await resolveAffiliateCommissionAmount(
    referral.referrerId,
    referral.userType,
    referral.userType === 'dealer' ? { dealerPlanTier: dealerPlanTier! } : undefined
  );

  const now = admin.firestore.Timestamp.now();
  const data: Omit<AffiliateCommission, 'id'> = {
    affiliateId: referral.referrerId,
    affiliateName: affiliate.name,
    affiliateEmail: affiliate.email,
    referralId: referral.id,
    referredId: referral.referredId,
    referredEmail: referral.referredEmail,
    referralCode: referral.referralCode,
    userType: referral.userType,
    dealerPlanTier: referral.userType === 'dealer' ? resolvedTier : undefined,
    amount,
    currency,
    status: 'approved',
    payoutStatus: 'pending',
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getDb().collection('affiliate_commissions').add({
    ...data,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await refreshAffiliateStats(referral.referrerId);

  return { id: docRef.id, ...data };
}

export async function cancelAffiliateReferralIfAwaitingFirstCharge(userId: string): Promise<void> {
  const referralSnap = await getDb()
    .collection('referrals')
    .where('referredId', '==', userId)
    .where('referrerType', '==', 'affiliate')
    .limit(1)
    .get();

  if (referralSnap.empty) return;

  const referralDoc = referralSnap.docs[0];
  const referral = referralDoc.data();

  if (referral.status === 'rewarded' || referral.status === 'cancelled') return;

  const commissionSnap = await getDb()
    .collection('affiliate_commissions')
    .where('referralId', '==', referralDoc.id)
    .limit(1)
    .get();

  if (!commissionSnap.empty) return;

  const { cancelReferral } = await import('./referrals');
  await cancelReferral(referralDoc.id);
}

export async function listAffiliateCommissionsForPayout(): Promise<AffiliateCommission[]> {
  const snap = await getDb()
    .collection('affiliate_commissions')
    .where('status', '==', 'approved')
    .get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as AffiliateCommission)
    .filter((c) => ['pending', 'deferred', 'failed'].includes(String(c.payoutStatus || 'pending')));
}

export interface AffiliatePayoutCronResult {
  processed: number;
  deferred: number;
  failed: number;
  errors: Array<{ commissionId: string; message: string }>;
}

export async function processWeeklyAffiliatePayouts(): Promise<AffiliatePayoutCronResult> {
  const { transferAffiliateCommission, syncAffiliateConnectAccountFromStripe } = await import(
    './stripe-connect-affiliates'
  );

  const result: AffiliatePayoutCronResult = {
    processed: 0,
    deferred: 0,
    failed: 0,
    errors: [],
  };

  const deferredEmailSent = new Set<string>();

  async function notifyAffiliateConnectRequired(
    affiliate: NonNullable<Awaited<ReturnType<typeof getAffiliatePartner>>>,
    items: AffiliateCommission[]
  ): Promise<void> {
    if (!affiliate || deferredEmailSent.has(affiliate.id)) return;
    deferredEmailSent.add(affiliate.id);

    const pendingAmount = items.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const { sendAffiliateConnectRequiredEmail } = await import('./welcome-email');
    void sendAffiliateConnectRequiredEmail({
      email: affiliate.email,
      name: affiliate.name,
      pendingAmount,
      currency: items[0]?.currency || 'USD',
    }).catch((err) =>
      console.warn('[affiliate-payouts] connect reminder email failed:', err)
    );
  }

  const commissions = await listAffiliateCommissionsForPayout();
  const byAffiliate = new Map<string, AffiliateCommission[]>();

  for (const c of commissions) {
    const list = byAffiliate.get(c.affiliateId) || [];
    list.push(c);
    byAffiliate.set(c.affiliateId, list);
  }

  for (const [affiliateId, items] of byAffiliate) {
    const affiliate = await getAffiliatePartner(affiliateId);
    if (!affiliate?.stripeConnectAccountId) {
      for (const c of items) {
        await getDb().collection('affiliate_commissions').doc(c.id).update({
          payoutStatus: 'deferred',
          payoutError: 'Afiliado sin cuenta Stripe Connect',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        result.deferred++;
      }
      if (affiliate) await notifyAffiliateConnectRequired(affiliate, items);
      continue;
    }

    await syncAffiliateConnectAccountFromStripe(affiliateId);

    const refreshed = await getAffiliatePartner(affiliateId);
    if (!refreshed?.stripeConnectPayoutsEnabled) {
      for (const c of items) {
        await getDb().collection('affiliate_commissions').doc(c.id).update({
          payoutStatus: 'deferred',
          payoutError: 'Onboarding Stripe Connect incompleto',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        result.deferred++;
      }
      if (refreshed) await notifyAffiliateConnectRequired(refreshed, items);
      continue;
    }

    for (const c of items) {
      try {
        await transferAffiliateCommission(c.id);
        result.processed++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.failed++;
        result.errors.push({ commissionId: c.id, message });
        await getDb().collection('affiliate_commissions').doc(c.id).update({
          payoutStatus: 'failed',
          payoutError: message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  return result;
}

export async function retryAffiliateCommissionPayout(commissionId: string): Promise<void> {
  const { transferAffiliateCommission } = await import('./stripe-connect-affiliates');
  await getDb().collection('affiliate_commissions').doc(commissionId).update({
    payoutStatus: 'pending',
    payoutError: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await transferAffiliateCommission(commissionId);
}

export async function markAffiliateCommissionStripePaid(
  commissionId: string,
  stripeTransferId: string
): Promise<void> {
  const ref = getDb().collection('affiliate_commissions').doc(commissionId);
  const snap = await ref.get();
  if (!snap.exists) return;

  await ref.update({
    status: 'paid',
    payoutStatus: 'paid',
    stripeTransferId,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    paymentReference: stripeTransferId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const affiliateId = snap.data()?.affiliateId;
  if (affiliateId) await refreshAffiliateStats(String(affiliateId));
}

export async function listAffiliateCommissions(filter?: {
  status?: 'approved' | 'paid' | 'cancelled';
  payoutStatus?: string;
  affiliateId?: string;
  limit?: number;
}): Promise<AffiliateCommission[]> {
  let query: admin.firestore.Query = getDb()
    .collection('affiliate_commissions')
    .orderBy('createdAt', 'desc');

  if (filter?.status) {
    query = query.where('status', '==', filter.status);
  }
  if (filter?.affiliateId) {
    query = query.where('affiliateId', '==', filter.affiliateId);
  }

  const snap = await query.limit(filter?.limit ?? 200).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AffiliateCommission);
}

export async function markAffiliateCommissionPaid(
  commissionId: string,
  paidBy: string,
  paymentReference?: string,
  paymentNotes?: string
): Promise<void> {
  const ref = getDb().collection('affiliate_commissions').doc(commissionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Comisión no encontrada');
  }

  const data = snap.data() || {};
  if (data.status === 'paid') {
    throw new Error('Esta comisión ya fue pagada');
  }
  if (data.status === 'cancelled') {
    throw new Error('No se puede pagar una comisión cancelada');
  }

  await ref.update({
    status: 'paid',
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    paidBy,
    paymentReference: paymentReference?.trim() || null,
    paymentNotes: paymentNotes?.trim() || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (data.affiliateId) {
    await refreshAffiliateStats(String(data.affiliateId));
  }
}

export async function cancelAffiliateCommissionForReferral(referralId: string): Promise<void> {
  const snap = await getDb()
    .collection('affiliate_commissions')
    .where('referralId', '==', referralId)
    .limit(1)
    .get();

  if (snap.empty) return;

  const doc = snap.docs[0];
  const data = doc.data();
  if (data.status === 'paid') return;

  await doc.ref.update({
    status: 'cancelled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (data.affiliateId) {
    await refreshAffiliateStats(String(data.affiliateId));
  }
}

export async function sendAffiliateRegistrationWelcomeEmail(params: {
  name: string;
  email: string;
  referralCode: string;
  selfRegistered?: boolean;
  temporaryPassword?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const { sendAffiliateWelcomeEmail } = await import('./welcome-email');
  return sendAffiliateWelcomeEmail({
    email: params.email,
    name: params.name,
    referralCode: params.referralCode,
    referralLink: buildAffiliateReferralLink(params.referralCode),
    createdByAdmin: params.selfRegistered !== true,
    temporaryPassword: params.temporaryPassword,
  });
}

export function buildAffiliateReferralLink(referralCode: string, baseUrl?: string): string {
  if (baseUrl) {
    const trimmed = baseUrl.replace(/\/$/, '');
    return `${trimmed}/register?ref=${encodeURIComponent(referralCode)}`;
  }
  return buildPublicWebUrl(`/register?ref=${encodeURIComponent(referralCode)}`);
}

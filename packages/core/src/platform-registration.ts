/**
 * Registro multi-perfil: el mismo email puede tener cuentas separadas
 * (dealer, vendedor, anunciante) con contraseñas distintas por portal.
 */

import * as admin from 'firebase-admin';
import { getFirestore, getAuth } from '@autodealers/shared';
import { setAppPassword, type AuthAppKey } from './app-passwords';
import { normalizeLoginEmail } from './user-auth-sync';

export type PlatformProfileKind = 'dealer' | 'seller' | 'advertiser' | 'affiliate' | 'business' | 'customer';

const PROFILE_LABELS: Record<PlatformProfileKind, string> = {
  dealer: 'concesionario',
  seller: 'vendedor',
  advertiser: 'anunciante',
  affiliate: 'afiliado',
  business: 'negocio automotriz',
  customer: 'cliente',
};

const DEALER_ROLES = new Set(['dealer', 'master_dealer', 'dealer_admin', 'manager']);

export class PlatformProfileExistsError extends Error {
  readonly kind: PlatformProfileKind;
  readonly code = 'PROFILE_ALREADY_EXISTS';

  constructor(kind: PlatformProfileKind) {
    super(`Ya tienes una cuenta de ${PROFILE_LABELS[kind]} con este correo. Inicia sesión en ese portal.`);
    this.name = 'PlatformProfileExistsError';
    this.kind = kind;
  }
}

function getDb() {
  return getFirestore();
}

function getAuthInstance() {
  return getAuth();
}

export async function findPlatformProfile(
  email: string,
  kind: PlatformProfileKind
): Promise<{ id: string; authUserId?: string } | null> {
  const normalized = normalizeLoginEmail(email);
  if (!normalized) return null;
  const db = getDb();

  if (kind === 'advertiser' || kind === 'affiliate') {
    const collection = kind === 'advertiser' ? 'advertisers' : 'affiliate_partners';
    const snap = await db.collection(collection).where('email', '==', normalized).limit(5).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data() || {};
      return {
        id: doc.id,
        authUserId: typeof data.authUserId === 'string' ? data.authUserId : doc.id,
      };
    }
    return null;
  }

  const snap = await db.collection('users').where('email', '==', normalized).limit(20).get();
  for (const doc of snap.docs) {
    const role = String(doc.data()?.role || '');
    if (kind === 'seller' && role === 'seller') {
      return {
        id: doc.id,
        authUserId: String(doc.data()?.authUserId || doc.id),
      };
    }
    if (kind === 'dealer' && DEALER_ROLES.has(role)) {
      return {
        id: doc.id,
        authUserId: String(doc.data()?.authUserId || doc.id),
      };
    }
    if (kind === 'business' && role === 'automotive_business') {
      return {
        id: doc.id,
        authUserId: String(doc.data()?.authUserId || doc.id),
      };
    }
    if (kind === 'customer' && role === 'customer') {
      return {
        id: doc.id,
        authUserId: String(doc.data()?.authUserId || doc.id),
      };
    }
  }

  return null;
}

export async function ensureAuthAccount(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ authUserId: string; created: boolean }> {
  const normalized = normalizeLoginEmail(params.email);
  const auth = getAuthInstance();

  try {
    const existing = await auth.getUserByEmail(normalized);
    return { authUserId: existing.uid, created: false };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code !== 'auth/user-not-found') {
      throw error;
    }
  }

  try {
    const userRecord = await auth.createUser({
      email: normalized,
      password: params.password,
      displayName: params.displayName,
    });
    return { authUserId: userRecord.uid, created: true };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/email-already-exists' || code === 'auth/email-already-in-use') {
      const existing = await auth.getUserByEmail(normalized);
      return { authUserId: existing.uid, created: false };
    }
    throw error;
  }
}

export function resolveAppKeyForRole(role: string): AuthAppKey {
  if (role === 'seller') return 'seller';
  if (role === 'automotive_business') return 'business';
  if (role === 'advertiser') return 'advertiser';
  if (role === 'customer') return 'customer';
  return 'dealer';
}

export async function storeAppPasswordForProfile(params: {
  appKey: AuthAppKey;
  email: string;
  profileId: string;
  authUserId: string;
  password: string;
  source?: 'reset' | 'admin' | 'first_login' | 'migration';
}): Promise<void> {
  await setAppPassword({
    appKey: params.appKey,
    email: params.email,
    userId: params.profileId,
    authUserId: params.authUserId,
    password: params.password,
    source: params.source || 'first_login',
  });
}

export async function registerAdvertiserAccount(params: {
  email: string;
  password: string;
  contactName: string;
  companyName: string;
  phone?: string;
  website?: string;
  industry?: string;
}): Promise<{ advertiserId: string; authUserId: string }> {
  const normalized = normalizeLoginEmail(params.email);
  const existing = await findPlatformProfile(normalized, 'advertiser');
  if (existing) {
    throw new PlatformProfileExistsError('advertiser');
  }

  const { authUserId, created } = await ensureAuthAccount({
    email: normalized,
    password: params.password,
    displayName: params.contactName,
  });

  const db = getDb();
  const advertiserRef = created
    ? db.collection('advertisers').doc(authUserId)
    : db.collection('advertisers').doc();

  await advertiserRef.set({
    email: normalized,
    authUserId,
    companyName: params.companyName,
    contactName: params.contactName,
    phone: params.phone || '',
    website: params.website || '',
    industry: params.industry || 'other',
    status: 'pending',
    plan: null,
    registrationSource: 'self',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await storeAppPasswordForProfile({
    appKey: 'advertiser',
    email: normalized,
    profileId: advertiserRef.id,
    authUserId,
    password: params.password,
  });

  if (created) {
    await getAuthInstance().setCustomUserClaims(authUserId, { role: 'advertiser' });
  }

  return { advertiserId: advertiserRef.id, authUserId };
}

/**
 * Sincronización de Firebase Auth con Firestore y reglas de tenantId/dealerId al registrar usuarios.
 */

import { getFirestore, getAuth } from '@autodealers/shared';
import * as admin from 'firebase-admin';

function getDb() {
  return getFirestore();
}

function getAuthInstance() {
  return getAuth();
}

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$';
  const all = upper + lower + digits + special;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const rest = Array.from({ length: Math.max(4, length - required.length) }, () => pick(all));
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export type RegistrationLinksInput = {
  role: string;
  tenantId?: string;
  tenantType?: string | null;
  tenantOwnerId?: string | null;
  userId: string;
  explicitDealerId?: string | null;
};

export type RegistrationLinks = {
  tenantId?: string;
  /** undefined = no change; null = remove dealerId; string = set dealerId */
  dealerId?: string | null;
};

/**
 * Determina tenantId/dealerId correctos según rol y tipo de tenant.
 * - Titular de tenant seller independiente: sin dealerId.
 * - Vendedor empleado de dealer: tenantId = dealer, dealerId = dealer.
 * - Vendedor con tenant propio bajo un dealer: tenantId = seller tenant, dealerId = dealer padre.
 */
export function resolveRegistrationLinks(input: RegistrationLinksInput): RegistrationLinks {
  const { role, tenantId, tenantType, tenantOwnerId, userId, explicitDealerId } = input;
  const tid = typeof tenantId === 'string' ? tenantId.trim() : '';
  if (!tid) {
    return { dealerId: null };
  }

  const explicit =
    typeof explicitDealerId === 'string' && explicitDealerId.trim()
      ? explicitDealerId.trim()
      : undefined;
  const tType = typeof tenantType === 'string' ? tenantType : undefined;

  if (role === 'dealer' || role === 'master_dealer') {
    return { tenantId: tid, dealerId: null };
  }

  if (!['seller', 'manager', 'dealer_admin', 'assistant'].includes(role)) {
    return { tenantId: tid, dealerId: explicit ?? null };
  }

  if (tType === 'dealer') {
    if (role === 'seller') {
      return { tenantId: tid, dealerId: explicit || tid };
    }
    return { tenantId: tid, dealerId: null };
  }

  if (tType === 'seller') {
    const isOwner = !tenantOwnerId || tenantOwnerId === userId;
    if (isOwner && explicit && explicit !== tid) {
      return { tenantId: tid, dealerId: explicit };
    }
    if (isOwner) {
      return { tenantId: tid, dealerId: null };
    }
    return { tenantId: tid, dealerId: explicit ?? null };
  }

  return { tenantId: tid, dealerId: explicit ?? null };
}

export async function applyRegistrationLinks(
  userId: string,
  links: RegistrationLinks,
  role: string
): Promise<void> {
  const patch: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (links.tenantId) {
    patch.tenantId = links.tenantId;
  }
  if (links.dealerId === null) {
    patch.dealerId = admin.firestore.FieldValue.delete();
  } else if (typeof links.dealerId === 'string' && links.dealerId.trim()) {
    patch.dealerId = links.dealerId.trim();
  }

  await getDb().collection('users').doc(userId).update(patch);

  const claims: Record<string, string> = { role };
  const tenantClaim = links.tenantId || (patch.tenantId as string | undefined);
  if (tenantClaim) {
    claims.tenantId = tenantClaim;
  } else {
    const userSnap = await getDb().collection('users').doc(userId).get();
    const tid = userSnap.data()?.tenantId;
    if (typeof tid === 'string' && tid.trim()) {
      claims.tenantId = tid.trim();
    }
  }
  if (typeof links.dealerId === 'string' && links.dealerId.trim()) {
    claims.dealerId = links.dealerId.trim();
  }

  await getAuthInstance().setCustomUserClaims(userId, claims);
}

export async function finalizeUserRegistration(userId: string): Promise<RegistrationLinks> {
  const userSnap = await getDb().collection('users').doc(userId).get();
  if (!userSnap.exists) {
    return {};
  }
  const user = userSnap.data() || {};
  const tenantId = typeof user.tenantId === 'string' ? user.tenantId.trim() : '';
  if (!tenantId) {
    return {};
  }

  const tenantSnap = await getDb().collection('tenants').doc(tenantId).get();
  const tData = tenantSnap.data() || {};

  const links = resolveRegistrationLinks({
    role: typeof user.role === 'string' ? user.role : 'seller',
    tenantId,
    tenantType: tData.type,
    tenantOwnerId: tData.ownerId,
    userId,
    explicitDealerId: user.dealerId,
  });

  await applyRegistrationLinks(userId, links, typeof user.role === 'string' ? user.role : 'seller');
  return links;
}

export async function syncLoginEmail(userId: string, newEmail: string): Promise<void> {
  const normalized = normalizeLoginEmail(newEmail);
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Email inválido');
  }
  await getAuthInstance().updateUser(userId, { email: normalized });
}

export async function setTemporaryPassword(
  userId: string,
  password?: string
): Promise<{ password: string }> {
  const pwd = password?.trim() || generateTemporaryPassword();
  if (pwd.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }
  await getAuthInstance().updateUser(userId, { password: pwd });
  await getDb()
    .collection('users')
    .doc(userId)
    .update({
      mustChangePassword: true,
      temporaryPasswordSetAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  return { password: pwd };
}

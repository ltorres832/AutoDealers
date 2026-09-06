/**
 * Sesiones de soporte: un admin de plataforma entra al panel dealer/seller/business/advertiser
 * actuando como el usuario titular, sin restricciones de membresía.
 * Colección: support_sessions/{id}
 */

import { randomBytes } from 'crypto';
import { getFirestore } from './firebase';

export const SUPPORT_SESSION_TTL_HOURS = 4;
export const SUPPORT_COOKIE_NAME = 'authToken';

export type SupportPortal = 'dealer' | 'seller' | 'business' | 'advertiser';

export interface SupportSession {
  id: string;
  adminUserId: string;
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  targetRole: string;
  targetTenantId: string;
  targetName?: string;
  portal: SupportPortal;
  status: 'active' | 'ended' | 'expired';
  reason?: string;
  createdAt: Date;
  expiresAt: Date;
  endedAt?: Date;
}

export interface SupportSessionTokenPayload {
  uid: string;
  role: string;
  exp: number;
  support: true;
  sid: string;
  aid: string;
  tenantId?: string;
  advertiserId?: string;
}

function getDb() {
  return getFirestore();
}

function sessionsRef() {
  return getDb().collection('support_sessions');
}

export function encodeSupportSessionToken(payload: SupportSessionTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
}

export function tryParseSupportSessionToken(token: string): SupportSessionTokenPayload | null {
  if (!token || token.length >= 200) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);
    if (!data || data.support !== true || typeof data.sid !== 'string' || typeof data.uid !== 'string') {
      return null;
    }
    return data as SupportSessionTokenPayload;
  } catch {
    return null;
  }
}

function resolvePortalFromRole(role: string): SupportPortal {
  const dealerPortalRoles = new Set([
    'dealer',
    'master_dealer',
    'dealer_admin',
    'manager',
    'fi_manager',
  ]);
  if (role === 'seller') return 'seller';
  if (dealerPortalRoles.has(role)) return 'dealer';
  if (role === 'automotive_business') return 'business';
  if (role === 'advertiser') return 'advertiser';
  throw new Error(`El rol "${role}" no tiene panel de producto para soporte`);
}

export async function createSupportSession(input: {
  adminUserId: string;
  adminEmail: string;
  targetUserId: string;
  reason?: string;
}): Promise<{ session: SupportSession; token: string; portal: SupportPortal }> {
  const userDoc = await getDb().collection('users').doc(input.targetUserId).get();
  let role = '';
  let tenantId = '';
  let email = '';
  let name = '';
  let advertiserId: string | undefined;

  if (userDoc.exists) {
    const user = userDoc.data() || {};
    role = String(user.role || '');
    tenantId = String(user.tenantId || '').trim();
    email = String(user.email || '');
    name = String(user.name || '');
  } else {
    // Anunciantes viven en advertisers/{id} (a veces id === authUserId)
    const advDoc = await getDb().collection('advertisers').doc(input.targetUserId).get();
    if (advDoc.exists) {
      const adv = advDoc.data() || {};
      role = 'advertiser';
      advertiserId = advDoc.id;
      tenantId = advDoc.id;
      email = String(adv.email || '');
      name = String(adv.companyName || adv.contactName || '');
    } else {
      const byAuth = await getDb()
        .collection('advertisers')
        .where('authUserId', '==', input.targetUserId)
        .limit(1)
        .get();
      if (!byAuth.empty) {
        const d = byAuth.docs[0];
        const adv = d.data() || {};
        role = 'advertiser';
        advertiserId = d.id;
        tenantId = d.id;
        email = String(adv.email || '');
        name = String(adv.companyName || adv.contactName || '');
      } else {
        throw new Error('Usuario objetivo no encontrado');
      }
    }
  }

  if (!tenantId && role !== 'advertiser') {
    throw new Error('El usuario no tiene tenantId asignado');
  }
  if (!tenantId) tenantId = advertiserId || input.targetUserId;

  const portal = resolvePortalFromRole(role);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SUPPORT_SESSION_TTL_HOURS * 60 * 60 * 1000);
  const id = randomBytes(16).toString('hex');

  const session: SupportSession = {
    id,
    adminUserId: input.adminUserId,
    adminEmail: input.adminEmail,
    targetUserId: input.targetUserId,
    targetEmail: email,
    targetRole: role,
    targetTenantId: tenantId,
    targetName: name,
    portal,
    status: 'active',
    reason: input.reason?.trim() || undefined,
    createdAt: now,
    expiresAt,
  };

  await sessionsRef().doc(id).set(JSON.parse(JSON.stringify(session)));

  try {
    await getDb().collection('audit_logs').add({
      type: 'support_session_started',
      adminUserId: input.adminUserId,
      adminEmail: input.adminEmail,
      targetUserId: input.targetUserId,
      targetTenantId: tenantId,
      portal,
      supportSessionId: id,
      reason: session.reason || null,
      createdAt: now,
    });
  } catch {
    /* no bloquear */
  }

  const token = encodeSupportSessionToken({
    uid: input.targetUserId,
    role,
    exp: Math.floor(expiresAt.getTime() / 1000),
    support: true,
    sid: id,
    aid: input.adminUserId,
    tenantId,
    advertiserId,
  });

  return { session, token, portal };
}

export async function getSupportSession(sessionId: string): Promise<SupportSession | null> {
  const doc = await sessionsRef().doc(sessionId).get();
  if (!doc.exists) return null;
  const data = doc.data() as any;
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    expiresAt: data.expiresAt?.toDate?.() || new Date(data.expiresAt),
    endedAt: data.endedAt?.toDate?.() || (data.endedAt ? new Date(data.endedAt) : undefined),
  } as SupportSession;
}

export async function validateSupportSessionToken(token: string): Promise<{
  session: SupportSession;
  payload: SupportSessionTokenPayload;
} | null> {
  const payload = tryParseSupportSessionToken(token);
  if (!payload) return null;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    await endSupportSession(payload.sid, 'expired').catch(() => undefined);
    return null;
  }

  const session = await getSupportSession(payload.sid);
  if (!session) return null;
  if (session.status !== 'active') return null;
  if (session.targetUserId !== payload.uid) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await endSupportSession(session.id, 'expired');
    return null;
  }

  return { session, payload };
}

export async function endSupportSession(
  sessionId: string,
  status: 'ended' | 'expired' = 'ended'
): Promise<void> {
  await sessionsRef()
    .doc(sessionId)
    .set(
      {
        status,
        endedAt: new Date(),
      },
      { merge: true }
    );
}

/**
 * Resuelve el usuario titular a impersonar a partir de tenantId, userId o advertiserId.
 */
export async function resolveSupportTarget(input: {
  userId?: string;
  tenantId?: string;
  advertiserId?: string;
}): Promise<{ userId: string }> {
  if (input.userId?.trim()) {
    return { userId: input.userId.trim() };
  }

  if (input.advertiserId?.trim()) {
    const id = input.advertiserId.trim();
    const adv = await getDb().collection('advertisers').doc(id).get();
    if (!adv.exists) throw new Error('Anunciante no encontrado');
    const authUserId = String(adv.data()?.authUserId || id).trim();
    return { userId: authUserId || id };
  }

  const tenantId = input.tenantId?.trim();
  if (!tenantId) {
    throw new Error('Indica userId, tenantId o advertiserId');
  }

  const tenantDoc = await getDb().collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    throw new Error('Tenant no encontrado');
  }
  const tenant = tenantDoc.data() || {};
  if (typeof tenant.ownerId === 'string' && tenant.ownerId.trim()) {
    return { userId: tenant.ownerId.trim() };
  }

  const usersSnap = await getDb()
    .collection('users')
    .where('tenantId', '==', tenantId)
    .limit(20)
    .get();
  const preferred = usersSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .find(
      (u) =>
        u.status !== 'inactive' &&
        (u.role === 'dealer' ||
          u.role === 'seller' ||
          u.role === 'master_dealer' ||
          u.role === 'automotive_business')
    );
  if (preferred) return { userId: preferred.id };

  throw new Error('No hay un usuario titular para este tenant');
}

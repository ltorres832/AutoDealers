import { createHash, randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';
import { getAuth, getAuthForCustomTokens, getFirestore } from './firebase';
import { normalizeLoginEmail } from './user-auth-sync';

export type AuthAppKey = 'admin' | 'seller' | 'dealer' | 'advertiser' | 'affiliate' | 'public' | 'business' | 'customer';

export const AUTH_PROFILE_COOKIE = 'authProfileId';

const DEALER_APP_ROLES = new Set(['dealer', 'master_dealer', 'dealer_admin', 'manager']);

function roleMatchesAuthApp(role: string, appKey: AuthAppKey): boolean {
  if (appKey === 'seller') return role === 'seller';
  if (appKey === 'business') return role === 'automotive_business';
  if (appKey === 'customer') return role === 'customer';
  if (appKey === 'dealer') return DEALER_APP_ROLES.has(role) || role === 'seller';
  return false;
}

function dealerRoleRank(role: string): number {
  if (DEALER_APP_ROLES.has(role)) return 0;
  if (role === 'seller') return 1;
  return 9;
}

export function isAuthAppKey(value: unknown): value is AuthAppKey {
  return (
    value === 'admin' ||
    value === 'seller' ||
    value === 'dealer' ||
    value === 'advertiser' ||
    value === 'affiliate' ||
    value === 'public' ||
    value === 'business' ||
    value === 'customer'
  );
}

const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';
const RESET_TTL_MS = 60 * 60 * 1000;

function appEmailKey(appKey: AuthAppKey, email: string): string {
  const normalized = normalizeLoginEmail(email);
  return `${appKey}_${createHash('sha256').update(normalized).digest('hex')}`;
}

function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return { algorithm: `pbkdf2-${DIGEST}`, iterations: ITERATIONS, salt, hash };
}

function verifyPassword(password: string, credential: Record<string, unknown>): boolean {
  const salt = typeof credential.salt === 'string' ? credential.salt : '';
  const expected = typeof credential.hash === 'string' ? credential.hash : '';
  const iterations = Number(credential.iterations || ITERATIONS);
  if (!salt || !expected || !Number.isFinite(iterations)) return false;

  const actual = pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export async function findUserForAuthApp(email: string, appKey: AuthAppKey): Promise<{
  userId: string;
  email: string;
  data: Record<string, unknown>;
} | null> {
  const normalized = normalizeLoginEmail(email);
  if (!normalized) return null;
  const db = getFirestore();

  if (appKey === 'admin') {
    const adminSnap = await db.collection('admin_users').where('email', '==', normalized).get();
    if (!adminSnap.empty) {
      // Prefer doc id = Firebase Auth UID (legacy docs used email as id).
      const uidDoc =
        adminSnap.docs.find((doc) => !doc.id.includes('@') && doc.id.length >= 20) ||
        adminSnap.docs[0];
      const data = uidDoc.data() || {};
      return { userId: uidDoc.id, email: normalized, data: { ...data, role: 'admin' } };
    }

    const adminUserSnap = await db.collection('users').where('email', '==', normalized).limit(5).get();
    for (const doc of adminUserSnap.docs) {
      const data = doc.data() || {};
      if (data.role === 'admin') {
        return { userId: doc.id, email: normalized, data };
      }
    }
  }

  if (appKey === 'advertiser') {
    const advertiserSnap = await db.collection('advertisers').where('email', '==', normalized).limit(1).get();
    if (!advertiserSnap.empty) {
      const doc = advertiserSnap.docs[0];
      const data = doc.data() || {};
      return { userId: doc.id, email: normalized, data: { ...data, role: 'advertiser' } };
    }
  }

  if (appKey === 'affiliate') {
    const affiliateSnap = await db.collection('affiliate_partners').where('email', '==', normalized).limit(1).get();
    if (!affiliateSnap.empty) {
      const doc = affiliateSnap.docs[0];
      const data = doc.data() || {};
      if (data.status === 'inactive') return null;
      return {
        userId: String(data.authUserId || doc.id),
        email: normalized,
        data: { ...data, role: 'affiliate', affiliateId: doc.id },
      };
    }
  }

  const usersSnap = await db.collection('users').where('email', '==', normalized).limit(20).get();
  const userDocs = usersSnap.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() || {},
  }));

  if (appKey === 'seller') {
    const match = userDocs.find((u) => String(u.data.role || '') === 'seller');
    if (match) {
      return { userId: match.id, email: normalized, data: match.data };
    }
  }

  if (appKey === 'dealer') {
    const dealerMatch = userDocs.find((u) => DEALER_APP_ROLES.has(String(u.data.role || '')));
    if (dealerMatch) {
      return { userId: dealerMatch.id, email: normalized, data: dealerMatch.data };
    }
    const sellerMatch = userDocs.find((u) => String(u.data.role || '') === 'seller');
    if (sellerMatch) {
      return { userId: sellerMatch.id, email: normalized, data: sellerMatch.data };
    }
  }

  if (appKey === 'business') {
    const match = userDocs.find((u) => String(u.data.role || '') === 'automotive_business');
    if (match) {
      return { userId: match.id, email: normalized, data: match.data };
    }
  }

  if (appKey === 'customer') {
    const match = userDocs.find((u) => String(u.data.role || '') === 'customer');
    if (match) {
      return { userId: match.id, email: normalized, data: match.data };
    }
  }

  if (appKey === 'public' && userDocs.length > 0) {
    const other = userDocs.find((u) => String(u.data.role || '') !== 'customer');
    const customer = userDocs.find((u) => String(u.data.role || '') === 'customer');
    const match = other || customer || userDocs[0];
    return { userId: match.id, email: normalized, data: match.data };
  }

  return null;
}

export async function resolveUsersProfileForAuthApp(params: {
  appKey: AuthAppKey;
  authUid?: string;
  profileId?: string;
  email?: string;
}): Promise<{ userId: string; email: string; data: Record<string, unknown> } | null> {
  const db = getFirestore();
  const authUid = String(params.authUid || '').trim();
  const profileId = String(params.profileId || '').trim();
  const email = params.email ? normalizeLoginEmail(params.email) : '';

  const linkedToAuth = (id: string, data: Record<string, unknown>) => {
    if (!authUid) return true;
    const linked = String(data.authUserId || id);
    return linked === authUid || id === authUid;
  };

  const toResult = (id: string, data: Record<string, unknown>) => ({
    userId: id,
    email: normalizeLoginEmail(String(data.email || email)),
    data,
  });

  if (profileId) {
    const snap = await db.collection('users').doc(profileId).get();
    if (snap.exists) {
      const data = snap.data() || {};
      const role = String(data.role || '');
      if (roleMatchesAuthApp(role, params.appKey) && linkedToAuth(snap.id, data)) {
        return toResult(snap.id, data);
      }
    }
  }

  const candidates: Array<{ id: string; data: Record<string, unknown> }> = [];
  const seen = new Set<string>();
  const pushCandidate = (id: string, data: Record<string, unknown>) => {
    if (seen.has(id)) return;
    const role = String(data.role || '');
    if (!roleMatchesAuthApp(role, params.appKey) || !linkedToAuth(id, data)) return;
    seen.add(id);
    candidates.push({ id, data });
  };

  if (authUid) {
    const byId = await db.collection('users').doc(authUid).get();
    if (byId.exists) {
      pushCandidate(byId.id, byId.data() || {});
    }
    const byAuth = await db.collection('users').where('authUserId', '==', authUid).limit(20).get();
    for (const doc of byAuth.docs) {
      pushCandidate(doc.id, doc.data() || {});
    }
  }

  if (email) {
    const byEmail = await findUserForAuthApp(email, params.appKey);
    if (byEmail && linkedToAuth(byEmail.userId, byEmail.data)) {
      pushCandidate(byEmail.userId, byEmail.data);
    }
  }

  if (params.appKey === 'dealer') {
    candidates.sort(
      (a, b) => dealerRoleRank(String(a.data.role || '')) - dealerRoleRank(String(b.data.role || ''))
    );
  }

  const match = candidates[0];
  return match ? toResult(match.id, match.data) : null;
}

export async function getAppPasswordCredential(appKey: AuthAppKey, email: string) {
  const doc = await getFirestore().collection('app_password_credentials').doc(appEmailKey(appKey, email)).get();
  return doc.exists ? { id: doc.id, ...(doc.data() || {}) } : null;
}

export async function resolveAuthenticatedUserId(params: {
  appKey: AuthAppKey;
  email: string;
  password: string;
  firebaseSignIn: (email: string, password: string) => Promise<string | null>;
}): Promise<{ userId: string; authUserId: string } | { error: 'invalid_credentials' | 'config' }> {
  const appCredential = await verifyAppPassword(params.appKey, params.email, params.password);
  if (appCredential.configured) {
    if (!appCredential.ok || !appCredential.userId) {
      return { error: 'invalid_credentials' };
    }
    return {
      userId: appCredential.userId,
      authUserId: appCredential.authUserId || appCredential.userId,
    };
  }

  const firebaseUid = await params.firebaseSignIn(params.email, params.password);
  if (!firebaseUid) {
    return { error: 'invalid_credentials' };
  }

  const profile = await findUserForAuthApp(params.email, params.appKey);
  if (profile) {
    const authUserId = String(profile.data.authUserId || profile.userId);
    return { userId: profile.userId, authUserId };
  }

  return { userId: firebaseUid, authUserId: firebaseUid };
}

export async function verifyAppPassword(appKey: AuthAppKey, email: string, password: string): Promise<{
  ok: boolean;
  configured: boolean;
  userId?: string;
  authUserId?: string;
}> {
  const credential = await getAppPasswordCredential(appKey, email);
  if (!credential) return { ok: false, configured: false };
  if (credential.disabled === true) return { ok: false, configured: true };
  const ok = verifyPassword(password, credential);
  return {
    ok,
    configured: true,
    userId: ok && typeof credential.userId === 'string' ? credential.userId : undefined,
    authUserId:
      ok && typeof credential.authUserId === 'string'
        ? credential.authUserId
        : ok && typeof credential.userId === 'string'
          ? credential.userId
          : undefined,
  };
}

export async function setAppPassword(params: {
  appKey: AuthAppKey;
  email: string;
  userId: string;
  authUserId?: string;
  password: string;
  source: 'reset' | 'admin' | 'first_login' | 'migration';
}) {
  const normalized = normalizeLoginEmail(params.email);
  if (params.password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }
  const now = new Date();
  const hashed = hashPassword(params.password);
  await getFirestore().collection('app_password_credentials').doc(appEmailKey(params.appKey, normalized)).set(
    {
      appKey: params.appKey,
      email: normalized,
      userId: params.userId,
      authUserId: params.authUserId || params.userId,
      ...hashed,
      source: params.source,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );
}

export async function createAppPasswordReset(params: {
  appKey: AuthAppKey;
  email: string;
}): Promise<{ token?: string; userId?: string; email: string; skipped?: boolean }> {
  const normalized = normalizeLoginEmail(params.email);
  const user = await findUserForAuthApp(normalized, params.appKey);
  if (!user) return { email: normalized, skipped: true };

  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now = new Date();
  await getFirestore().collection('app_password_resets').doc(tokenHash).set({
    appKey: params.appKey,
    email: normalized,
    userId: user.userId,
    tokenHash,
    used: false,
    createdAt: now,
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
  });

  return { token, userId: user.userId, email: normalized };
}

export async function confirmAppPasswordReset(params: {
  appKey?: AuthAppKey;
  token: string;
  password: string;
}): Promise<{ ok: true; userId: string; email: string }> {
  const tokenHash = createHash('sha256').update(String(params.token || '')).digest('hex');
  const ref = getFirestore().collection('app_password_resets').doc(tokenHash);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('El enlace no es válido o ya expiró.');
  const data = snap.data() || {};
  const appKey = data.appKey as AuthAppKey;
  if (data.used === true || (params.appKey && data.appKey !== params.appKey)) {
    throw new Error('El enlace no es válido o ya fue utilizado.');
  }
  const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    throw new Error('El enlace expiró. Solicita uno nuevo.');
  }

  const userId = String(data.userId || '');
  const email = String(data.email || '');
  if (!userId || !email) throw new Error('El enlace no contiene una cuenta válida.');

  await setAppPassword({
    appKey,
    email,
    userId,
    password: params.password,
    source: 'reset',
  });
  await ref.set({ used: true, usedAt: new Date() }, { merge: true });
  await getAuth().revokeRefreshTokens(userId).catch(() => undefined);
  return { ok: true, userId, email };
}

export async function createAppCustomToken(
  userId: string,
  appKey: AuthAppKey,
  extraClaims?: Record<string, string>
): Promise<string> {
  let authUid = userId;
  try {
    await getAuth().getUser(userId);
  } catch {
    const userSnap = await getFirestore().collection('users').doc(userId).get();
    const linkedUser = String(userSnap.data()?.authUserId || '');
    if (linkedUser) {
      authUid = linkedUser;
    } else {
      const advertiserSnap = await getFirestore().collection('advertisers').doc(userId).get();
      const linkedAdvertiser = String(advertiserSnap.data()?.authUserId || '');
      if (linkedAdvertiser) authUid = linkedAdvertiser;
    }
  }
  // Usar signer con FIREBASE_PRIVATE_KEY: ADC de App Hosting no puede mint custom tokens.
  return getAuthForCustomTokens().createCustomToken(authUid, {
    authApp: appKey,
    profileId: extraClaims?.profileId || userId,
    ...(extraClaims || {}),
  });
}

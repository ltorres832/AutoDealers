import { NextRequest } from 'next/server';
import { getAuth, getUserById } from '@autodealers/core';
import { resolveUsersProfileForAuthApp } from '@autodealers/core/app-passwords';

export interface AuthContext {
  userId: string;
  role: string;
  tenantId?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthContext | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('authToken')?.value;
    const token = authHeader?.replace('Bearer ', '') || cookieToken;
    if (!token) return null;

    // Sesión de soporte (admin → panel business)
    if (token.length < 200) {
      try {
        const { tryParseSupportSessionToken, validateSupportSessionToken } = await import(
          '@autodealers/core'
        );
        if (tryParseSupportSessionToken(token)) {
          const validated = await validateSupportSessionToken(token);
          if (!validated || validated.session.portal !== 'business') return null;
          return {
            userId: validated.session.targetUserId,
            role: 'automotive_business',
            tenantId: validated.session.targetTenantId,
          };
        }
      } catch {
        /* continuar */
      }
    }

    try {
      const decoded = await getAuth().verifyIdToken(token);
      if (!decoded.uid) return null;
      const claimProfileId =
        typeof (decoded as { profileId?: unknown }).profileId === 'string'
          ? String((decoded as { profileId?: string }).profileId)
          : '';
      const profile = await resolveUsersProfileForAuthApp({
        appKey: 'business',
        authUid: decoded.uid,
        profileId: claimProfileId,
        email: decoded.email,
      });
      if (!profile) return null;
      return {
        userId: profile.userId,
        role: 'automotive_business',
        tenantId: String(profile.data.tenantId || (decoded as { tenantId?: string }).tenantId || ''),
      };
    } catch {
      // session cookie
    }

    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString());
    if (!sessionData.uid || !sessionData.role) return null;
    if (sessionData.exp && sessionData.exp < Math.floor(Date.now() / 1000)) return null;
    if (sessionData.support === true) {
      const { validateSupportSessionToken } = await import('@autodealers/core');
      const validated = await validateSupportSessionToken(token);
      if (!validated || validated.session.portal !== 'business') return null;
      return {
        userId: validated.session.targetUserId,
        role: 'automotive_business',
        tenantId: validated.session.targetTenantId,
      };
    }
    if (sessionData.role !== 'automotive_business' && sessionData.role !== 'admin') return null;
    return {
      userId: sessionData.uid,
      role: sessionData.role,
      tenantId: sessionData.tenantId,
    };
  } catch {
    return null;
  }
}

export async function requireBusiness(request: NextRequest): Promise<AuthContext | null> {
  const auth = await verifyAuth(request);
  if (!auth || (auth.role !== 'automotive_business' && auth.role !== 'admin')) return null;
  if (!auth.tenantId) {
    const user = await getUserById(auth.userId);
    if (user?.tenantId) return { ...auth, tenantId: user.tenantId };
  }
  return auth;
}

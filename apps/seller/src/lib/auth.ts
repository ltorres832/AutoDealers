import { NextRequest } from 'next/server';
import { getAuth } from '@autodealers/core';
import { cookies } from 'next/headers';

const auth = getAuth();

const ADMIN_SESSION_RE = /^[a-f0-9]{64}$/i;

export interface AuthUser {
  userId: string;
  email: string;
  role: 'admin' | 'dealer' | 'seller';
  tenantId?: string;
  dealerId?: string;
}

function decodeToken(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isAdminSessionToken(token: string): boolean {
  return ADMIN_SESSION_RE.test(token);
}

/** Header Bearer primero; ignora sessionId del panel admin en cookie. */
async function resolveRequestToken(request: NextRequest): Promise<string | undefined> {
  const header = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
    ?.trim();

  const cookieRaw = request.cookies.get('authToken')?.value;
  let cookieStoreRaw: string | undefined;
  try {
    cookieStoreRaw = (await cookies()).get('authToken')?.value;
  } catch {
    /* ignore */
  }

  const candidates = [header, cookieRaw, cookieStoreRaw]
    .filter((t): t is string => Boolean(t))
    .map(decodeToken);

  for (const t of candidates) {
    if (isAdminSessionToken(t)) continue;
    if (t.startsWith('eyJ') && t.length >= 200) return t;
  }

  for (const t of candidates) {
    if (isAdminSessionToken(t)) continue;
    if (t.length < 200) return t;
  }

  return undefined;
}

/**
 * Verifica autenticación y retorna usuario
 */
export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = await resolveRequestToken(request);

    if (!token) {
      return null;
    }

    // Token personalizado base64 (sesión seller legacy)
    if (token.length < 200) {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const sessionData = JSON.parse(decoded);

        if (sessionData.exp && sessionData.exp < Math.floor(Date.now() / 1000)) {
          return null;
        }

        if (sessionData.role !== 'seller') {
          return null;
        }

        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(sessionData.uid).get();

        if (!userDoc.exists) {
          return null;
        }

        const userData = userDoc.data();
        if (userData?.role !== 'seller') {
          return null;
        }

        return {
          userId: sessionData.uid,
          email: userData?.email || '',
          role: userData?.role || 'seller',
          tenantId: userData?.tenantId,
          dealerId: userData?.dealerId,
        };
      } catch {
        return null;
      }
    }

    if (!token.startsWith('eyJ')) {
      return null;
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (verifyError: any) {
      if (
        verifyError.code === 'auth/id-token-expired' ||
        verifyError.code === 'auth/argument-error' ||
        verifyError.message?.includes('Decoding Firebase ID token failed')
      ) {
        return null;
      }
      return null;
    }

    if (!decodedToken) {
      return null;
    }

    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();

    if (userData?.role !== 'seller') {
      return null;
    }

    return {
      userId: decodedToken.uid,
      email: decodedToken.email || userData?.email || '',
      role: userData?.role || 'seller',
      tenantId: userData?.tenantId,
      dealerId: userData?.dealerId,
    };
  } catch (error: any) {
    console.error('❌ verifyAuth error:', error.message || error);
    return null;
  }
}

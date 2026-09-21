import { NextRequest } from 'next/server';
import { getAuth } from '@autodealers/core';
import { AUTH_PROFILE_COOKIE, resolveUsersProfileForAuthApp } from '@autodealers/core/app-passwords';
import { cookies } from 'next/headers';
import * as admin from 'firebase-admin';

const auth = getAuth();

const ADMIN_SESSION_RE = /^[a-f0-9]{64}$/i;

export interface AuthUser {
  userId: string;
  email: string;
  role: 'admin' | 'dealer' | 'seller';
  tenantId?: string;
  dealerId?: string;
  billingMode?: 'self_service' | 'dealer_managed';
  supportMode?: boolean;
  supportSessionId?: string;
  supportAdminId?: string;
  supportAdminEmail?: string;
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

/** Header Bearer primero; ahora también acepta sessionIds del panel admin. */
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

  // Primero intentar sessionIds del panel admin (64 caracteres hex)
  for (const t of candidates) {
    if (isAdminSessionToken(t)) return t;
  }

  // Luego tokens Firebase estándar
  for (const t of candidates) {
    if (isAdminSessionToken(t)) continue;
    if (t.startsWith('eyJ') && t.length >= 200) return t;
  }

  // Finalmente tokens de soporte y base64 legacy
  for (const t of candidates) {
    if (isAdminSessionToken(t)) continue;
    // Tokens de soporte (sup1.… o base64 con support:true)
    if (t.startsWith('sup1.') || t.length < 200) return t;
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

    // Soporte primero (puede ser largo; no discriminar por longitud)
    try {
      const { tryParseSupportSessionToken, validateSupportSessionToken } = await import(
        '@autodealers/core'
      );
      if (tryParseSupportSessionToken(token)) {
        const validated = await validateSupportSessionToken(token);
        if (!validated) return null;
        const { session } = validated;
        if (session.portal !== 'seller') return null;

        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(session.targetUserId).get();
        if (!userDoc.exists) return null;
        const userData = userDoc.data();
        if (userData?.role !== 'seller' && session.targetRole !== 'seller') return null;

        return {
          userId: session.targetUserId,
          email: userData?.email || session.targetEmail || '',
          role: 'seller',
          tenantId: userData?.tenantId || session.targetTenantId,
          dealerId: userData?.dealerId,
          billingMode: userData?.billingMode,
          supportMode: true,
          supportSessionId: session.id,
          supportAdminId: session.adminUserId,
          supportAdminEmail: session.adminEmail,
        };
      }
    } catch {
      /* continuar */
    }

    // Verificar si es un sessionId del panel admin (64 caracteres hex)
    const ADMIN_SESSION_RE = /^[a-f0-9]{64}$/i;
    if (ADMIN_SESSION_RE.test(token)) {
      try {
        const { getFirestore } = await import('@autodealers/core');
        const db = getFirestore();
        
        // Verificar la sesión en Firestore
        const sessionDoc = await db.collection('sessions').doc(token).get();
        
        if (!sessionDoc.exists) {
          console.warn('⚠️ Admin session no encontrada en seller app');
          return null;
        }
        
        const sessionData = sessionDoc.data();
        
        // Verificar expiración
        if (sessionData?.expiresAt) {
          const expiresAt = sessionData.expiresAt.toDate();
          if (expiresAt < new Date()) {
            console.warn('⚠️ Admin session expirada en seller app');
            await sessionDoc.ref.delete();
            return null;
          }
        }
        
        // Actualizar última actividad
        await sessionDoc.ref.update({
          lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Buscar usuario (admin o regular)
        const adminDoc = await db.collection('admin_users').doc(sessionData.userId).get();
        let userDoc;
        let userData;
        let role;
        
        if (adminDoc.exists) {
          const adminData = adminDoc.data();
          if (adminData?.isActive === false) {
            console.warn('⚠️ Admin inactivo en seller app');
            return null;
          }
          userData = adminData;
          role = 'admin';
        } else {
          userDoc = await db.collection('users').doc(sessionData.userId).get();
          if (!userDoc.exists) {
            console.warn('⚠️ Usuario no encontrado en seller app');
            return null;
          }
          userData = userDoc.data();
          role = userData?.role as string;
          
          if (userData?.status === 'suspended' || userData?.status === 'cancelled') {
            console.warn('⚠️ Usuario suspendido en seller app');
            return null;
          }
        }
        
        // Solo permitir admins y sellers en el seller app
        if (role !== 'admin' && role !== 'seller') {
          console.warn('⚠️ Rol no tiene acceso al seller app:', role);
          return null;
        }
        
        return {
          userId: sessionData.userId,
          email: sessionData.email || userData?.email || '',
          role: role === 'admin' ? 'seller' : role, // Admins acceden como sellers
          tenantId: userData?.tenantId || sessionData.tenantId,
          dealerId: userData?.dealerId,
          billingMode: userData?.billingMode,
          supportMode: role === 'admin', // Admins acceden en modo soporte
        };
      } catch (error: any) {
        console.error('❌ Error verificando admin session en seller app:', error.message);
        return null;
      }
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
          billingMode: userData?.billingMode,
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
    const claimProfileId =
      typeof (decodedToken as { profileId?: unknown }).profileId === 'string'
        ? String((decodedToken as { profileId?: string }).profileId)
        : '';
    const cookieProfileId = request.cookies.get(AUTH_PROFILE_COOKIE)?.value || '';
    const profile = await resolveUsersProfileForAuthApp({
      appKey: 'seller',
      authUid: decodedToken.uid,
      profileId: claimProfileId || cookieProfileId,
      email: decodedToken.email,
    });
    if (!profile) {
      return null;
    }
    const userDoc = await db.collection('users').doc(profile.userId).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();

    if (userData?.role !== 'seller') {
      return null;
    }

    return {
      userId: profile.userId,
      email: decodedToken.email || userData?.email || '',
      role: userData?.role || 'seller',
      tenantId: userData?.tenantId,
      dealerId: userData?.dealerId,
      billingMode: userData?.billingMode,
    };
  } catch (error: any) {
    console.error('❌ verifyAuth error:', error.message || error);
    return null;
  }
}

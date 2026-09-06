import { NextRequest } from 'next/server';
import { getAuth } from '@autodealers/core';

export interface AuthContext {
  userId: string;
  role: string;
  advertiserId?: string;
}

/**
 * Verifica autenticación.
 * Intenta primero verificar como ID token; si falla, intenta decodificar el
 * token de sesión base64 que generamos en /api/advertiser/login.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthContext | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('authToken')?.value;

    const token = authHeader?.replace('Bearer ', '') || cookieToken;
    if (!token) return null;

    // Sesión de soporte (admin → panel advertiser)
    if (token.length < 200) {
      try {
        const { tryParseSupportSessionToken, validateSupportSessionToken } = await import(
          '@autodealers/core'
        );
        if (tryParseSupportSessionToken(token)) {
          const validated = await validateSupportSessionToken(token);
          if (!validated || validated.session.portal !== 'advertiser') return null;
          return {
            userId: validated.session.targetUserId,
            role: 'advertiser',
            advertiserId:
              validated.payload.advertiserId || validated.session.targetTenantId || undefined,
          };
        }
      } catch {
        /* continuar */
      }
    }

    // 1) Intentar como ID token
    try {
      const decoded = await getAuth().verifyIdToken(token);
      if (!decoded.uid) return null;
      return {
        userId: decoded.uid,
        role: (decoded as any).role,
        advertiserId: (decoded as any).advertiserId,
      };
    } catch {
      // Continuar intentando como sesión base64
    }

    // 2) Intentar como token de sesión base64 (no firmado, pero suficiente para este entorno)
    try {
      const sessionData = JSON.parse(Buffer.from(token, 'base64').toString());
      if (!sessionData.uid || !sessionData.role) return null;

      // Validar expiración si existe
      if (sessionData.exp && sessionData.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      if (sessionData.support === true) {
        const { validateSupportSessionToken } = await import('@autodealers/core');
        const validated = await validateSupportSessionToken(token);
        if (!validated || validated.session.portal !== 'advertiser') return null;
        return {
          userId: validated.session.targetUserId,
          role: 'advertiser',
          advertiserId:
            validated.payload.advertiserId || validated.session.targetTenantId || undefined,
        };
      }

      return {
        userId: sessionData.uid,
        role: sessionData.role,
        advertiserId: sessionData.advertiserId,
      };
    } catch (err) {
      console.error('Auth verification error (session decode):', err);
      return null;
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}


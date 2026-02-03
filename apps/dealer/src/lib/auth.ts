import { NextRequest } from 'next/server';
import { getAuth } from '@autodealers/core';
import { cookies } from 'next/headers';

const auth = getAuth();

export interface AuthUser {
  userId: string;
  email: string;
  role: 'admin' | 'dealer' | 'seller';
  tenantId?: string;
  dealerId?: string;
}

/**
 * Verifica autenticación y retorna usuario
 */
export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Intentar obtener el token de múltiples fuentes
    let token: string | undefined;
    
    // 1. De las cookies del request (método preferido)
    const authTokenCookie = request.cookies.get('authToken')?.value;
    if (authTokenCookie) {
      try {
        // Decodificar el token si está URL-encoded
        token = decodeURIComponent(authTokenCookie);
      } catch (decodeError) {
        // Si falla decodeURIComponent, usar el token tal cual
        token = authTokenCookie;
      }
    }
    
    // 2. Del header Authorization (PRIORITARIO - más confiable que cookies)
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const headerToken = authHeader.replace('Bearer ', '').trim();
      if (headerToken && headerToken.length > 200) {
        token = headerToken;
      }
    }
    
    // 3. Intentar desde cookies() de Next.js como fallback
    if (!token) {
      try {
        const cookieStore = await cookies();
        const cookieToken = cookieStore.get('authToken')?.value;
        if (cookieToken) {
          try {
            token = decodeURIComponent(cookieToken);
          } catch {
            token = cookieToken;
          }
        }
      } catch (cookieError) {
        // Silenciar errores de cookies
      }
    }

    if (!token) {
      return null;
    }
    
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (verifyError: any) {
      // Solo loggear errores críticos de autenticación
      if (verifyError.code !== 'auth/id-token-expired') {
        console.error('❌ [verifyAuth] Error al verificar token:', verifyError.code || verifyError.message);
      }
      return null;
    }
    
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    
    // Verificar que el rol sea dealer
    if (userData?.role !== 'dealer') {
      return null;
    }
    
    return {
      userId: decodedToken.uid,
      email: decodedToken.email || userData?.email || '',
      role: userData?.role || 'dealer',
      tenantId: userData?.tenantId,
      dealerId: userData?.dealerId,
    };
  } catch (error: any) {
    // Solo loggear errores críticos
    console.error('❌ [verifyAuth] Error crítico:', error.message || error);
    return null;
  }
}

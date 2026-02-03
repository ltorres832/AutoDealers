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
    
    // Logging reducido - solo en desarrollo
    // 1. De las cookies del request (método preferido)
    const authTokenCookie = request.cookies.get('authToken')?.value;
    if (authTokenCookie) {
      // Decodificar el token si está codificado en URL
      token = decodeURIComponent(authTokenCookie);
    }
    
    // 2. Del header Authorization
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      }
    }
    
    // 3. Intentar desde cookies() de Next.js como fallback
    if (!token) {
      try {
        const cookieStore = await cookies();
        const cookieToken = cookieStore.get('authToken')?.value;
        if (cookieToken) {
          token = cookieToken;
        }
      } catch (cookieError) {
        // Si falla cookies(), continuar sin token
      }
    }

    if (!token) {
      return null;
    }
    
    // Verificar si es un token personalizado (base64 codificado) en lugar de un Firebase ID token
    // Los tokens personalizados son más cortos (< 200 caracteres) y pueden decodificarse como JSON
    if (token.length < 200) {
      try {
        // Intentar decodificar como base64
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const sessionData = JSON.parse(decoded);
        
        // Verificar expiración
        if (sessionData.exp && sessionData.exp < Math.floor(Date.now() / 1000)) {
          return null;
        }
        
        // Verificar que el rol sea 'seller'
        if (sessionData.role !== 'seller') {
          return null;
        }
        
        // Verificar que el usuario existe y es seller en Firestore
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
      } catch (decodeError: any) {
        return null;
      }
    }
    
    // Verificar que el token tenga el formato correcto de JWT (debe empezar con "eyJ")
    if (!token.startsWith('eyJ')) {
      return null;
    }
    
    // Intentar verificar como Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (verifyError: any) {
      // Si el token está expirado o es inválido, retornar null
      if (verifyError.code === 'auth/id-token-expired' || 
          verifyError.code === 'auth/argument-error' ||
          verifyError.message?.includes('Decoding Firebase ID token failed')) {
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
    
    // CRÍTICO: Verificar que el usuario es realmente un seller
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
    console.error('❌ verifyAuth error stack:', error.stack);
    return null;
  }
}

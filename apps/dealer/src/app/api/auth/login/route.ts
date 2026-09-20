import { isDealerPortalRole } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, getAuth } from '@autodealers/shared';
import {
  createAppCustomToken,
  resolveAuthenticatedUserId,
} from '@autodealers/core/app-passwords';
import { ensureAuthCustomClaims } from '@autodealers/core/user-auth-sync';
import * as admin from 'firebase-admin';
import { getFirebaseWebClientConfig, AUTODEALERS_FIREBASE_WEB_DEFAULTS } from '@autodealers/shared/firebase-web-client-config';

export const dynamic = 'force-dynamic';

async function legacyFirebaseSignIn(email: string, password: string): Promise<string | null> {
  const apiKeys = [
    getFirebaseWebClientConfig().apiKey,
    AUTODEALERS_FIREBASE_WEB_DEFAULTS.apiKey,
  ].filter((key, index, all) => key && all.indexOf(key) === index);
  for (const apiKey of apiKeys) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.localId) return String(data.localId);
  }
  return null;
}

function createDealerSessionToken(userId: string, role: string): string {
  const sessionData = {
    uid: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  };
  return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid Content-Type. Expected application/json.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    let profileId = body.userId as string | undefined;
    let { token } = body;
    let authUserId = profileId;
    let issuedCustomToken = false;
    let issuedSessionToken = false;
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!profileId && !token && email && password) {
      const authResult = await resolveAuthenticatedUserId({
        appKey: 'dealer',
        email,
        password,
        firebaseSignIn: legacyFirebaseSignIn,
      });
      if ('error' in authResult) {
        return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
      }
      profileId = authResult.userId;
      authUserId = authResult.authUserId;
      try {
        const claims = await ensureAuthCustomClaims(profileId, authUserId);
        token = await createAppCustomToken(authUserId, 'dealer', claims);
        issuedCustomToken = true;
      } catch (tokenError) {
        console.error('Dealer login: custom token creation failed', tokenError);
        return NextResponse.json(
          {
            error:
              'No se pudo generar el acceso de Firebase. Intenta de nuevo o contacta a soporte.',
          },
          { status: 500 }
        );
      }
    }

    if (!profileId || !token) {
      return NextResponse.json(
        { error: 'User ID and token are required' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    // Verificar el token de Firebase
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = issuedCustomToken
        ? ({ uid: authUserId, email } as admin.auth.DecodedIdToken)
        : issuedSessionToken
          ? ({ uid: profileId, email } as admin.auth.DecodedIdToken)
        : await auth.verifyIdToken(token);
    } catch (error: any) {
      console.error('Error verifying ID token:', error);
      return NextResponse.json(
        { error: 'Token de autenticación inválido o expirado' },
        { status: 401 }
      );
    }

    if (!issuedSessionToken && !issuedCustomToken) {
      const profileDoc = await db.collection('users').doc(profileId).get();
      const linkedAuth = String(profileDoc.data()?.authUserId || profileId);
      if (decodedToken.uid !== linkedAuth && decodedToken.uid !== profileId) {
        return NextResponse.json(
          { error: 'Token no coincide con el usuario' },
          { status: 401 }
        );
      }
    }

    // Obtener información del usuario desde Firestore
    let userDoc = await db.collection('users').doc(profileId).get();
    
    // Si no está en users, buscar en tenants/{tenantId}/sub_users
    if (!userDoc.exists) {
      // Buscar en todos los tenants
      const tenantsSnapshot = await db.collection('tenants').limit(100).get();
      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const subUserDoc = await db
          .collection('tenants')
          .doc(tenantId)
          .collection('sub_users')
          .doc(profileId)
          .get();
        
        if (subUserDoc.exists) {
          const subUserData = subUserDoc.data();
          // Verificar que sea dealer
          if (subUserData?.role === 'dealer') {
            // Verificar que la cuenta esté activa
            if (subUserData.status !== 'active' && subUserData.isActive !== true) {
              return NextResponse.json(
                { error: 'Tu cuenta no está activa. Por favor, verifica tu email o contacta a soporte.' },
                { status: 403 }
              );
            }
            
            return NextResponse.json({
              success: true,
              user: {
                id: profileId,
                email: subUserData.email || decodedToken.email || '',
                name: subUserData.name || subUserData.email || 'Usuario',
                role: 'dealer',
                tenantId: tenantId,
              },
            });
          }
        }
      }
      
      return NextResponse.json(
        { error: 'Usuario no encontrado en la base de datos o no tiene permisos de dealer' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (!userData) {
      return NextResponse.json(
        { error: 'Datos de usuario incompletos' },
        { status: 500 }
      );
    }

    // Verificar que sea dealer o vendedor (portal dealer compartido)
    if (!isDealerPortalRole(userData.role) && userData.role !== 'seller') {
      console.log('❌ Usuario no es dealer ni vendedor. Rol:', userData.role);
      return NextResponse.json(
        { error: 'Solo cuentas de concesionario o vendedores pueden acceder aquí. Tu rol actual es: ' + (userData.role || 'no definido') },
        { status: 403 }
      );
    }

    // Verificar que la cuenta esté activa (permitir si no tiene status o si está activo)
    if (userData.status && userData.status !== 'active' && userData.isActive !== true) {
      console.log('❌ Usuario no está activo. Status:', userData.status, 'isActive:', userData.isActive);
      return NextResponse.json(
        { error: 'Tu cuenta no está activa. Por favor, verifica tu email o contacta a soporte.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      customToken: issuedCustomToken ? token : undefined,
      sessionToken: issuedSessionToken ? token : undefined,
      user: {
        id: profileId,
        email: userData.email || decodedToken.email || '',
        name: userData.name || userData.email || 'Usuario',
        role: userData.role,
        tenantId: userData.tenantId || profileId, // Si no tiene tenantId, usar profileId como fallback
      },
    });
  } catch (error: any) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      { error: error.message || 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  createAppCustomToken,
  resolveAuthenticatedUserId,
} from '@autodealers/core/app-passwords';
import { ensureAuthCustomClaims } from '@autodealers/core/user-auth-sync';
import { getFirestore } from '@autodealers/core';
import { getFirebaseWebClientConfig, AUTODEALERS_FIREBASE_WEB_DEFAULTS } from '@autodealers/shared/firebase-web-client-config';

function createSellerSessionToken(userId: string): string {
  const sessionData = {
    uid: userId,
    role: 'seller',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  };
  return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

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

/**
 * API para validar usuario después de autenticación en el cliente
 * La verificación de contraseña se hace en el cliente con Firebase Auth
 * Esta API solo valida que el usuario existe y está activo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let profileId = body.userId as string | undefined;
    let authUserId: string | undefined;
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!profileId && email && password) {
      const authResult = await resolveAuthenticatedUserId({
        appKey: 'seller',
        email,
        password,
        firebaseSignIn: legacyFirebaseSignIn,
      });
      if ('error' in authResult) {
        return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
      }
      profileId = authResult.userId;
      authUserId = authResult.authUserId;
    }

    if (!profileId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Obtener información del usuario de Firestore
    const userDoc = await db.collection('users').doc(profileId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const role = userData?.role;
    const status = userData?.status;

    // Verificar que sea seller
    if (role !== 'seller') {
      return NextResponse.json(
        { error: 'Solo vendedores pueden acceder aquí' },
        { status: 403 }
      );
    }

    // Verificar que el usuario esté activo (si status existe, debe ser 'active')
    // Si status no existe, asumimos que está activo (compatibilidad con usuarios antiguos)
    if (status !== undefined && status !== 'active') {
      return NextResponse.json(
        { error: 'Tu cuenta está suspendida o cancelada' },
        { status: 403 }
      );
    }

    // El dashboard seller exige Firebase Auth (signInWithCustomToken). Sin customToken
    // el cliente guarda sessionToken corto y termina rebotando a /login.
    const tokenAuthUserId = authUserId || String(userData?.authUserId || profileId);
    let customToken: string;
    try {
      const claims = await ensureAuthCustomClaims(profileId, tokenAuthUserId);
      customToken = await createAppCustomToken(tokenAuthUserId, 'seller', claims);
    } catch (tokenError) {
      console.error('Seller login: custom token creation failed', tokenError);
      return NextResponse.json(
        {
          error:
            'No se pudo generar el acceso de Firebase. Intenta de nuevo o contacta a soporte.',
        },
        { status: 500 }
      );
    }

    const sessionToken = createSellerSessionToken(profileId);

    return NextResponse.json({
      success: true,
      customToken,
      sessionToken,
      user: {
        id: profileId,
        email: userData?.email,
        name: userData?.name,
        role: role,
        tenantId: userData?.tenantId,
        dealerId: userData?.dealerId,
      },
    });
  } catch (error) {
    console.error('Error validating user:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Error al validar usuario',
      },
      { status: 500 }
    );
  }
}

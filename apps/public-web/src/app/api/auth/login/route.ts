import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '../../../../lib/firebase-admin';
import { getFirestore } from '../../../../lib/firebase-admin';
import { identityToolkitSignInWithPassword } from '@/lib/identity-toolkit-http';

export const dynamic = 'force-dynamic';

const DEFAULT_PUBLIC_ORIGIN =
  'https://public-web-app--autodealers-7f62e.us-central1.hosted.app';

function getPublicOriginForToolkit(request: NextRequest): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const origin = request.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  if (host) {
    return `${proto}://${host.split(',')[0].trim()}`.replace(/\/$/, '');
  }

  return DEFAULT_PUBLIC_ORIGIN;
}

async function completeLoginWithVerifiedToken(
  idToken: string
): Promise<NextResponse> {
  const auth = getAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const db = getFirestore();
  const email = decoded.email || '';

  let userDoc = await db.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists && email) {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!snap.empty) {
      userDoc = snap.docs[0];
    }
  }

  if (!userDoc.exists) {
    return NextResponse.json({ error: 'Usuario no encontrado en la plataforma' }, { status: 404 });
  }

  const userData = userDoc.data();
  if (userData?.status !== 'active') {
    return NextResponse.json(
      { error: 'Tu cuenta no está activa. Por favor, contacta a soporte.' },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    user: {
      id: userData?.id || userDoc.id || decoded.uid,
      email: userData?.email,
      name: userData?.name,
      role: userData?.role,
      tenantId: userData?.tenantId,
    },
  });

  response.cookies.set('authToken', encodeURIComponent(idToken), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, password, serverAuthFallback } = body;

    if (typeof token === 'string' && token.length > 0) {
      try {
        return await completeLoginWithVerifiedToken(token);
      } catch (error: unknown) {
        console.error('Error verificando token:', error);
        return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
      }
    }

    if (
      serverAuthFallback === true &&
      typeof email === 'string' &&
      typeof password === 'string' &&
      email.length > 0 &&
      password.length > 0
    ) {
      const firebaseApiKey = (
        process.env.FIREBASE_IDENTITY_TOOLKIT_API_KEY ||
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
        ''
      ).trim();
      if (!firebaseApiKey) {
        return NextResponse.json(
          { error: 'Configuración del servidor incompleta (API key).' },
          { status: 503 }
        );
      }

      const originBase = getPublicOriginForToolkit(request);
      let idToken: string;
      try {
        const r = await identityToolkitSignInWithPassword(
          email,
          password,
          firebaseApiKey,
          originBase
        );
        idToken = r.idToken;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const apiBody = (e as Error & { body?: { error?: { message?: string } } }).body;
        const apiMsg = apiBody?.error?.message || msg;
        if (
          apiMsg.includes('INVALID_PASSWORD') ||
          apiMsg.includes('EMAIL_NOT_FOUND')
        ) {
          return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
        }
        if (/API_KEY|API key|INVALID_KEY|invalid.?api.?key/i.test(apiMsg)) {
          return NextResponse.json(
            { error: 'La API key no pudo usarse en el servidor. Revisa Credenciales (Identity Toolkit).' },
            { status: 503 }
          );
        }
        console.error('Identity Toolkit (fallback):', e);
        return NextResponse.json(
          { error: 'No se pudo completar el inicio de sesión. Intenta de nuevo.' },
          { status: 500 }
        );
      }

      try {
        return await completeLoginWithVerifiedToken(idToken);
      } catch (error: unknown) {
        console.error('Error verificando token (fallback):', error);
        return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
      }
    }

    if (body.email && body.password && !token) {
      return NextResponse.json(
        {
          error: 'LOGIN_REQUIRES_CLIENT_AUTH',
          help: 'Inicia sesión desde la página: el navegador usa Firebase Auth y luego envía el token al servidor.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Se requiere token de sesión' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Error parsing request:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 400 }
    );
  }
}

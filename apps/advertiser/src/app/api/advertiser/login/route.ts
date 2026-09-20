import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getAdvertiserById, getFirestore } from '@autodealers/core';
import { resolveAuthenticatedUserId } from '@autodealers/core/app-passwords';
import { getFirebaseWebClientConfig, AUTODEALERS_FIREBASE_WEB_DEFAULTS } from '@autodealers/shared/firebase-web-client-config';

export const dynamic = 'force-dynamic';

/** REST fallback cuando el cliente no envía idToken (p. ej. pruebas con curl). */
async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{ uid: string } | { error: 'invalid_credentials' | 'config' }> {
  const apiKeys = [
    getFirebaseWebClientConfig().apiKey,
    AUTODEALERS_FIREBASE_WEB_DEFAULTS.apiKey,
  ].filter((key, index, all) => key && all.indexOf(key) === index);

  if (apiKeys.length === 0) {
    return { error: 'config' };
  }

  for (const apiKey of apiKeys) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = (await res.json()) as {
      localId?: string;
      error?: { message?: string };
    };

    if (res.ok && data.localId) {
      return { uid: data.localId };
    }
  }

  return { error: 'invalid_credentials' };
}

async function completeLogin(profileId: string) {
  let advertiser = await getAdvertiserById(profileId);

  if (!advertiser) {
    const snap = await getFirestore()
      .collection('advertisers')
      .where('authUserId', '==', profileId)
      .limit(1)
      .get();
    if (!snap.empty) {
      advertiser = await getAdvertiserById(snap.docs[0].id);
    }
  }

  if (!advertiser) {
    return NextResponse.json(
      { error: 'Anunciante no encontrado' },
      { status: 404 }
    );
  }

  if (advertiser.status !== 'active') {
    return NextResponse.json(
      { error: 'Tu cuenta está suspendida o pendiente de aprobación' },
      { status: 403 }
    );
  }

  const sessionData = {
    uid: advertiser.id,
    role: 'advertiser',
    advertiserId: advertiser.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

  const response = NextResponse.json({
    success: true,
    advertiser: {
      id: advertiser.id,
      email: advertiser.email,
      companyName: advertiser.companyName,
      plan: advertiser.plan,
    },
  });

  response.cookies.set('authToken', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    let uid: string | null = null;

    if (idToken) {
      const decoded = await getAuth().verifyIdToken(idToken);
      uid = decoded.uid;
    } else if (email && password) {
      const authResult = await resolveAuthenticatedUserId({
        appKey: 'advertiser',
        email,
        password,
        firebaseSignIn: async (loginEmail, loginPassword) => {
          const signIn = await signInWithEmailPassword(loginEmail, loginPassword);
          if ('error' in signIn) return null;
          return signIn.uid;
        },
      });
      if ('error' in authResult) {
        if (authResult.error === 'config') {
          console.error('Advertiser login: Firebase API key unavailable');
          return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }
      uid = authResult.userId;
    } else {
      return NextResponse.json(
        { error: 'Email y contraseña requeridos' },
        { status: 400 }
      );
    }

    return await completeLogin(uid);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('Error in advertiser login:', err);

    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/id-token-expired' ||
      err.code === 'auth/argument-error'
    ) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

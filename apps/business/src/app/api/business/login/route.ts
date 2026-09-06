import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getFirestore, getUserById } from '@autodealers/core';
import { resolveAuthenticatedUserId } from '@autodealers/core/app-passwords';
import { getFirebaseWebClientConfig, AUTODEALERS_FIREBASE_WEB_DEFAULTS } from '@autodealers/shared/firebase-web-client-config';

export const dynamic = 'force-dynamic';

async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{ uid: string } | { error: 'invalid_credentials' | 'config' }> {
  const apiKeys = [
    getFirebaseWebClientConfig().apiKey,
    AUTODEALERS_FIREBASE_WEB_DEFAULTS.apiKey,
  ].filter((key, index, all) => key && all.indexOf(key) === index);

  if (apiKeys.length === 0) return { error: 'config' };

  for (const apiKey of apiKeys) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = (await res.json()) as { localId?: string };
    if (res.ok && data.localId) return { uid: data.localId };
  }
  return { error: 'invalid_credentials' };
}

async function completeLogin(profileId: string) {
  let user = await getUserById(profileId);
  if (!user || user.role !== 'automotive_business') {
    const snap = await getFirestore()
      .collection('users')
      .where('authUserId', '==', profileId)
      .limit(20)
      .get();
    const match = snap.docs.find((doc) => String(doc.data()?.role || '') === 'automotive_business');
    if (match) {
      user = await getUserById(match.id);
    }
  }
  if (!user || user.role !== 'automotive_business') {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
  }
  if (user.status && user.status !== 'active') {
    return NextResponse.json({ error: 'Tu cuenta está suspendida' }, { status: 403 });
  }

  const sessionData = {
    uid: user.id,
    role: 'automotive_business',
    tenantId: user.tenantId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
  const response = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId },
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
        appKey: 'business',
        email,
        password,
        firebaseSignIn: async (loginEmail, loginPassword) => {
          const signIn = await signInWithEmailPassword(loginEmail, loginPassword);
          if ('error' in signIn) return null;
          return signIn.uid;
        },
      });
      if ('error' in authResult) {
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }
      uid = authResult.userId;
    } else {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    return await completeLogin(uid);
  } catch (error) {
    console.error('business login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

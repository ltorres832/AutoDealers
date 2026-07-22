export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getAffiliatePartner, getAffiliateByAuthUserId } from '@autodealers/core';
import { resolveAuthenticatedUserId } from '@autodealers/core/app-passwords';
import { getFirebaseWebClientConfig, AUTODEALERS_FIREBASE_WEB_DEFAULTS } from '@autodealers/shared/firebase-web-client-config';
import { buildAffiliateAuthResponse } from '@/lib/affiliate-session';

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
  let affiliate = await getAffiliatePartner(profileId);
  if (!affiliate) {
    affiliate = await getAffiliateByAuthUserId(profileId);
  }
  if (!affiliate) {
    return NextResponse.json({ error: 'Afiliado no encontrado' }, { status: 404 });
  }
  if (affiliate.status !== 'active') {
    return NextResponse.json({ error: 'Tu cuenta está inactiva' }, { status: 403 });
  }

  const sessionAuthId = affiliate.authUserId || affiliate.id;

  return buildAffiliateAuthResponse(
    {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      referralCode: affiliate.referralCode,
    },
    sessionAuthId
  );
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
      const byAuth = await getAffiliateByAuthUserId(decoded.uid);
      uid = byAuth?.id || decoded.uid;
    } else if (email && password) {
      const authResult = await resolveAuthenticatedUserId({
        appKey: 'affiliate',
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
    console.error('affiliate login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

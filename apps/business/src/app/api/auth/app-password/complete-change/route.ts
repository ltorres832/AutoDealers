import { NextRequest, NextResponse } from 'next/server';
import {
  findUserForAuthApp,
  setAppPassword,
  verifyAppPassword,
} from '@autodealers/core/app-passwords';
import { getFirestore } from '@autodealers/shared';
import { getFirebaseWebClientConfig, AUTODEALERS_FIREBASE_WEB_DEFAULTS } from '@autodealers/shared/firebase-web-client-config';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const user = await findUserForAuthApp(email, 'business');
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    const credential = await verifyAppPassword('business', email, currentPassword);
    if (credential.configured) {
      if (!credential.ok) return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 });
    } else {
      const legacyUid = await legacyFirebaseSignIn(email, currentPassword);
      const authUserId = String(user.data.authUserId || user.userId);
      if (legacyUid !== user.userId && legacyUid !== authUserId) {
        return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 });
      }
    }

    await setAppPassword({
      appKey: 'business',
      email,
      userId: user.userId,
      password: newPassword,
      source: 'first_login',
    });
    await getFirestore().collection('users').doc(user.userId).set(
      { mustChangePassword: false, updatedAt: new Date() },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.' },
      { status: 400 }
    );
  }
}

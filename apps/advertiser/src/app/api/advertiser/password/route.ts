import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  findUserForAuthApp,
  setAppPassword,
  verifyAppPassword,
} from '@autodealers/core/app-passwords';
import { getAuth } from '@autodealers/core';
import { getFirestore } from '@autodealers/shared';
import {
  getFirebaseWebClientConfig,
  AUTODEALERS_FIREBASE_WEB_DEFAULTS,
} from '@autodealers/shared/firebase-web-client-config';

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
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || auth.email || '').trim();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const user = await findUserForAuthApp(email, 'advertiser');
    if (!user || user.userId !== auth.userId) {
      // Still allow if auth uid matches and email matches auth
      if (!auth.userId || (auth.email && auth.email.toLowerCase() !== email.toLowerCase())) {
        return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
      }
    }

    const userId = user?.userId || auth.userId;
    const credential = await verifyAppPassword('advertiser', email, currentPassword);
    if (credential.configured) {
      if (!credential.ok) {
        return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 });
      }
    } else {
      const legacyUid = await legacyFirebaseSignIn(email, currentPassword);
      if (!legacyUid || (legacyUid !== userId && legacyUid !== auth.userId)) {
        return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 });
      }
    }

    await setAppPassword({
      appKey: 'advertiser',
      email,
      userId,
      password: newPassword,
      source: 'first_login',
    });

    try {
      await getAuth().updateUser(userId, { password: newPassword });
    } catch {
      /* app password is source of truth for portal login */
    }

    await getFirestore().collection('users').doc(userId).set(
      { mustChangePassword: false, updatedAt: new Date() },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error: unknown) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

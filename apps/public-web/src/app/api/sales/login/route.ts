export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getSalesEmployeeByAuthUserId, getSalesEmployeeByEmail } from '@autodealers/core';
import { getFirebaseWebClientConfig, AUTODEALERS_FIREBASE_WEB_DEFAULTS } from '@autodealers/shared/firebase-web-client-config';
import { buildSalesEmployeeAuthResponse } from '@/lib/sales-employee-session';

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
  let employee = await getSalesEmployeeByAuthUserId(profileId);
  if (!employee) employee = await getSalesEmployeeByEmail(profileId);
  if (!employee) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
  }
  if (employee.status !== 'active') {
    return NextResponse.json({ error: 'Tu cuenta está inactiva' }, { status: 403 });
  }
  return buildSalesEmployeeAuthResponse(
    { id: employee.id, name: employee.name, email: employee.email },
    employee.authUserId || employee.id
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
      uid = decoded.uid;
    } else if (email && password) {
      const signIn = await signInWithEmailPassword(email, password);
      if ('error' in signIn) {
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }
      uid = signIn.uid;
    } else {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    return await completeLogin(uid);
  } catch (error) {
    console.error('sales employee login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

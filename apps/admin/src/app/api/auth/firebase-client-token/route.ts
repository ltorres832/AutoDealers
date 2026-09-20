export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

/**
 * Emite un custom token para Firebase Client SDK (listeners onSnapshot en el navegador).
 * El login del admin usa sesión en Firestore; sin este paso Firestore rechaza lecturas de memberships.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customToken = await getAuth().createCustomToken(authUser.userId, {
      role: 'admin',
      authApp: 'admin',
    });

    return NextResponse.json({ customToken });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al generar token';
    console.error('firebase-client-token:', error);
    return NextResponse.json({ customToken: null, fallback: true, error: message });
  }
}

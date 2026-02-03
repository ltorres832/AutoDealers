import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('authToken')?.value;
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');

    const db = getFirestore();
    
    const debug = {
      timestamp: new Date().toISOString(),
      cookieToken: cookieToken ? `${cookieToken.substring(0, 20)}...` : 'NO ENCONTRADO',
      headerToken: headerToken ? `${headerToken.substring(0, 20)}...` : 'NO ENCONTRADO',
      sessionExists: false,
      sessionData: null as any,
    };

    // Verificar sesión en Firestore
    const token = headerToken || cookieToken;
    if (token) {
      try {
        const sessionDoc = await db.collection('sessions').doc(token).get();
        debug.sessionExists = sessionDoc.exists;
        if (sessionDoc.exists) {
          const data = sessionDoc.data();
          debug.sessionData = {
            userId: data?.userId,
            email: data?.email,
            role: data?.role,
            expiresAt: data?.expiresAt?.toDate().toISOString(),
          };
        }
      } catch (e: any) {
        debug.sessionData = { error: e.message };
      }
    }

    return NextResponse.json(debug);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, PLATFORM_SOCIAL_TENANT_ID } from '@autodealers/core';

export const dynamic = 'force-dynamic';

/** Integraciones Meta de la cuenta de soporte de la plataforma (no del tenant del vehículo). */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const snapshot = await db
      .collection('tenants')
      .doc(PLATFORM_SOCIAL_TENANT_ID)
      .collection('integrations')
      .get();

    const integrations = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        status: data.status || 'inactive',
        name: data.credentials?.pageName,
      };
    });

    return NextResponse.json({ integrations, source: 'platform' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

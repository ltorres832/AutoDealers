import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createAdvertiser } from '@autodealers/core';

/**
 * Crea un anunciante desde el panel admin.
 * Genera un usuario en Firebase Auth con password aleatoria.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      companyName,
      contactName,
      phone = '',
      website = '',
      industry = 'other',
      plan = 'starter',
    } = body;

    if (!email || !companyName || !contactName) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const advertiser = await createAdvertiser({
      email,
      companyName,
      contactName,
      phone,
      website,
      industry,
      status: 'pending',
      plan,
    } as any);

    return NextResponse.json({ success: true, advertiser });
  } catch (error: any) {
    console.error('Error creating advertiser:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear anunciante' },
      { status: 500 }
    );
  }
}



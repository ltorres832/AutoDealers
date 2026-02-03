// API Route: Listar todos los aliases (Admin)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getEmailAliases } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId');
    const assignedTo = searchParams.get('assignedTo');

    const aliases = await getEmailAliases(dealerId || undefined, assignedTo || undefined);

    return NextResponse.json({ aliases });
  } catch (error) {
    console.error('Error getting email aliases:', error);
    return NextResponse.json(
      { error: 'Error al obtener aliases' },
      { status: 500 }
    );
  }
}




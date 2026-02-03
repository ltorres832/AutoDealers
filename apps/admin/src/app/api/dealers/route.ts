// API Route: Gestión de Dealers (Admin)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAllDealers, getDealerById } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'suspended' | 'cancelled' | 'pending' | undefined;
    const approvedByAdmin = searchParams.get('approvedByAdmin');

    const dealers = await getAllDealers({
      status,
      approvedByAdmin: approvedByAdmin ? approvedByAdmin === 'true' : undefined,
    });

    return NextResponse.json({ dealers });
  } catch (error) {
    console.error('Error getting dealers:', error);
    return NextResponse.json(
      { error: 'Error al obtener dealers' },
      { status: 500 }
    );
  }
}




export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getActiveMemberships } from '@autodealers/billing';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener membresías disponibles del mismo tipo (dealer)
    const plans = await getActiveMemberships('dealer');

    // Filtrar para no mostrar el plan actual
    // TODO: Obtener el plan actual y filtrarlo

    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error('Error fetching available plans:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



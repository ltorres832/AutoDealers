import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { suggestVehiclesForLead } from '@autodealers/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId es requerido' }, { status: 400 });
    }

    const suggestions = await suggestVehiclesForLead(auth.tenantId, leadId);

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error sugiriendo vehículos:', error);
    return NextResponse.json(
      { error: 'Error al sugerir vehículos', details: error.message },
      { status: 500 }
    );
  }
}



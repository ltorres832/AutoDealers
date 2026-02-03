import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { calculateAndUpdateApprovalScore, getFIRequestById } from '@autodealers/crm';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || (auth.role !== 'dealer' && auth.role !== 'seller')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, vehiclePrice, downPayment, monthlyPayment } = body;

    if (!requestId || vehiclePrice === undefined || downPayment === undefined || monthlyPayment === undefined) {
      return NextResponse.json(
        { error: 'requestId, vehiclePrice, downPayment y monthlyPayment son requeridos' },
        { status: 400 }
      );
    }

    // Calcular y actualizar score de aprobación
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }
    const score = await calculateAndUpdateApprovalScore(
      auth.tenantId,
      requestId,
      vehiclePrice,
      downPayment,
      monthlyPayment
    );

    return NextResponse.json({ score });
  } catch (error: any) {
    console.error('Error calculating approval score:', error);
    return NextResponse.json(
      { error: error.message || 'Error al calcular score de aprobación' },
      { status: 500 }
    );
  }
}


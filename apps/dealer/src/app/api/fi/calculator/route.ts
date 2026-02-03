import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { calculateFinancing, calculateAndUpdateFinancing } from '@autodealers/crm';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, calculator } = body;

    if (!calculator || !requestId) {
      return NextResponse.json(
        { error: 'requestId y calculator son requeridos' },
        { status: 400 }
      );
    }

    // Calcular financiamiento
    const calculation = calculateFinancing(calculator);

    // Actualizar solicitud F&I con el cálculo
    if (requestId) {
      if (!auth.tenantId) {
        return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
      }
      await calculateAndUpdateFinancing(
        auth.tenantId,
        requestId,
        calculator
      );
    }

    return NextResponse.json({ calculation });
  } catch (error: any) {
    console.error('Error calculating financing:', error);
    return NextResponse.json(
      { error: error.message || 'Error al calcular financiamiento' },
      { status: 500 }
    );
  }
}


export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { decodeVin, isValidVin } from '@autodealers/inventory';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const vin = String(body.vin || '').toUpperCase().replace(/\s+/g, '');
    if (!isValidVin(vin)) {
      return NextResponse.json({ error: 'VIN inválido. Debe tener 17 caracteres.' }, { status: 400 });
    }
    const result = await decodeVin(vin);
    if (!result) {
      return NextResponse.json(
        { error: 'No se pudo decodificar el VIN. Puedes completar los datos a mano.', vin },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, vin, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al decodificar VIN';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

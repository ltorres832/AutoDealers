import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSellersByDealer } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Solo dealers pueden ver sus vendedores
    if (auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sellers = await getSellersByDealer(auth.tenantId);

    return NextResponse.json({ sellers });
  } catch (error: any) {
    console.error('Error obteniendo vendedores:', error);
    return NextResponse.json(
      { error: 'Error al obtener vendedores', details: error.message },
      { status: 500 }
    );
  }
}



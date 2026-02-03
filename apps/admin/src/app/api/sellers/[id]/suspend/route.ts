import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { suspendSeller } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Solo dealers pueden suspender vendedores
    if (auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await suspendSeller(auth.tenantId, id);

    return NextResponse.json({ success: true, message: 'Vendedor suspendido exitosamente' });
  } catch (error: any) {
    console.error('Error suspendiendo vendedor:', error);
    return NextResponse.json(
      { error: error.message || 'Error al suspender vendedor' },
      { status: 400 }
    );
  }
}



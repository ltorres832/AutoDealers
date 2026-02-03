import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { deleteSeller } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Solo dealers pueden eliminar vendedores
    if (auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await deleteSeller(auth.tenantId, id);

    return NextResponse.json({ success: true, message: 'Vendedor eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error eliminando vendedor:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar vendedor' },
      { status: 400 }
    );
  }
}



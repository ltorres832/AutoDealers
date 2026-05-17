import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { adminReactivateSeller } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await adminReactivateSeller(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[admin/sellers reactivate]', e);
    const message = e instanceof Error ? e.message : 'Error al reactivar';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

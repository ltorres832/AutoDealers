export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { deleteReview } from '@autodealers/crm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; reviewId: string }> }
) {
  try {
    const auth = await verifyAuth(_request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, reviewId } = await params;
    if (!tenantId || !reviewId) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    await deleteReview(tenantId, reviewId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al eliminar reseña';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// API Route: Operaciones sobre un alias específico (Admin)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { suspendEmailAlias, activateEmailAlias, deleteEmailAlias } from '@autodealers/crm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ aliasId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { aliasId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'suspend') {
      await suspendEmailAlias(aliasId);
      return NextResponse.json({ success: true, message: 'Alias suspendido' });
    } else if (action === 'activate') {
      await activateEmailAlias(aliasId);
      return NextResponse.json({ success: true, message: 'Alias activado' });
    } else if (action === 'delete') {
      await deleteEmailAlias(aliasId);
      return NextResponse.json({ success: true, message: 'Alias eliminado' });
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating alias:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar alias' },
      { status: 500 }
    );
  }
}




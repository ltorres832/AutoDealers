// API Route: Operaciones sobre un dealer específico (Admin)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDealerById, approveDealer, rejectDealer } from '@autodealers/crm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { dealerId } = await params;
    const dealer = await getDealerById(dealerId);
    if (!dealer) {
      return NextResponse.json({ error: 'Dealer no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ dealer });
  } catch (error) {
    console.error('Error getting dealer:', error);
    return NextResponse.json(
      { error: 'Error al obtener dealer' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { dealerId } = await params;
    const body = await request.json();
    const { action, aliasesLimit, reason } = body;

    if (action === 'approve') {
      await approveDealer(dealerId, user.userId, aliasesLimit);
      return NextResponse.json({ success: true, message: 'Dealer aprobado' });
    } else if (action === 'reject') {
      await rejectDealer(dealerId, reason);
      return NextResponse.json({ success: true, message: 'Dealer rechazado' });
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating dealer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar dealer' },
      { status: 500 }
    );
  }
}




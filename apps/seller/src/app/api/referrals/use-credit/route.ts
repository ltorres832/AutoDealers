import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { dealerManagedReferralsResponse } from '@/lib/referrals-access-guard';
import { useRewardCredit, getAvailableCredits } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    if (!auth || auth.role !== 'seller') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const blocked = dealerManagedReferralsResponse(auth);
    if (blocked) return blocked;

    const body = await request.json();
    const { creditId, usedFor, type } = body;

    if (!creditId || !usedFor || !type) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    if (type !== 'promotion' && type !== 'banner') {
      return NextResponse.json({ error: 'Tipo de crédito inválido' }, { status: 400 });
    }

    const availableCredits = await getAvailableCredits(auth.userId, type);
    const credit = availableCredits.find((c) => c.id === creditId);

    if (!credit) {
      return NextResponse.json(
        { error: 'Crédito no encontrado o no disponible' },
        { status: 404 }
      );
    }

    const success = await useRewardCredit(creditId, usedFor);
    if (!success) {
      return NextResponse.json({ error: 'No se pudo usar el crédito' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Crédito aplicado correctamente',
    });
  } catch (error: unknown) {
    console.error('Error using credit:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

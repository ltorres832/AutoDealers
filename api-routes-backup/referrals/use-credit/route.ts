import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';
import { useRewardCredit, getAvailableCredits } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || (auth.role !== 'dealer' && auth.role !== 'seller')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { creditId, usedFor, type } = body;

    if (!creditId || !usedFor || !type) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el crédito pertenece al usuario
    const availableCredits = await getAvailableCredits(auth.userId, type);
    const credit = availableCredits.find((c: any) => c.id === creditId);

    if (!credit) {
      return NextResponse.json(
        { error: 'Crédito no encontrado o no disponible' },
        { status: 404 }
      );
    }

    // Usar el crédito
    const success = await useRewardCredit(creditId, usedFor);

    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo usar el crédito' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Crédito aplicado correctamente',
    });
  } catch (error: any) {
    console.error('Error using credit:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


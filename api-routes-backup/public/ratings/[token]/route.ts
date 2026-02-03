import { NextRequest, NextResponse } from 'next/server';
import { getRatingByToken } from '@autodealers/core';

export async function generateStaticParams() {
  return [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      );
    }

    const rating = await getRatingByToken(token);

    if (!rating) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 404 }
      );
    }

    // Verificar si está expirado
    if (rating.expiresAt && rating.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Esta encuesta ha expirado' },
        { status: 410 }
      );
    }

    return NextResponse.json({ rating });
  } catch (error: any) {
    console.error('Error fetching rating:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


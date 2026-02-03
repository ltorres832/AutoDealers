// Para static export, necesitamos generar los params estáticamente
export async function generateStaticParams() {
  return [];
}

import { NextRequest, NextResponse } from 'next/server';
import { getRatingByToken, completeRating } from '@autodealers/core';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const rating = await getRatingByToken(token);

    if (!rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    // Verificar si está expirada
    if (rating.expiresAt && new Date(rating.expiresAt) < new Date()) {
      return NextResponse.json({
        rating: {
          ...rating,
          status: 'expired',
        },
      });
    }

    return NextResponse.json({ rating });
  } catch (error: any) {
    console.error('Error fetching rating:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { sellerRating, dealerRating, sellerComment, dealerComment } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    if (!sellerRating || sellerRating < 1 || sellerRating > 5) {
      return NextResponse.json(
        { error: 'Invalid seller rating' },
        { status: 400 }
      );
    }

    // Obtener la calificación
    const rating = await getRatingByToken(token);

    if (!rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    if (rating.status !== 'pending') {
      return NextResponse.json(
        { error: 'Rating already completed or expired' },
        { status: 400 }
      );
    }

    // Verificar si está expirada
    if (rating.expiresAt && new Date(rating.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Rating expired' },
        { status: 400 }
      );
    }

    // Validar dealerRating si hay dealerId
    if (rating.dealerId) {
      if (!dealerRating || dealerRating < 1 || dealerRating > 5) {
        return NextResponse.json(
          { error: 'Invalid dealer rating' },
          { status: 400 }
        );
      }
    }

    // Completar la calificación
    await completeRating(
      rating.tenantId,
      rating.id,
      sellerRating,
      rating.dealerId ? dealerRating : undefined,
      sellerComment,
      rating.dealerId ? dealerComment : undefined
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error completing rating:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



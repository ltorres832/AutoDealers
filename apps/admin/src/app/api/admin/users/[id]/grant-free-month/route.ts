import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id: userId } = await params;
    const { months } = await request.json();
    
    if (!months || months < 1) {
      return NextResponse.json(
        { error: 'Debe especificar al menos 1 mes' },
        { status: 400 }
      );
    }
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};
    const currentRewards = userData.activeRewards || {
      nextMonthDiscount: 0,
      freeMonthsRemaining: 0,
      promotionCredits: 0,
      bannerCredits: 0,
    };

    // Agregar meses gratis
    const newFreeMonths = (currentRewards.freeMonthsRemaining || 0) + months;

    await userDoc.ref.update({
      activeRewards: {
        ...currentRewards,
        freeMonthsRemaining: newFreeMonths,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    return NextResponse.json({
      success: true,
      message: `${months} mes${months > 1 ? 'es' : ''} gratis otorgado${months > 1 ? 's' : ''} correctamente`,
      freeMonthsRemaining: newFreeMonths,
    });
  } catch (error: any) {
    console.error('Error granting free month:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


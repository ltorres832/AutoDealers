import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdvertiserById } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// POST - Cambiar de plan
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { newPlan } = body;

    if (!newPlan || !['starter', 'professional', 'premium'].includes(newPlan)) {
      return NextResponse.json(
        { error: 'Plan inválido' },
        { status: 400 }
      );
    }

    const advertiser = await getAdvertiserById(auth.userId);
    if (!advertiser) {
      return NextResponse.json(
        { error: 'Anunciante no encontrado' },
        { status: 404 }
      );
    }

    // Si ya tiene el mismo plan
    if (advertiser.plan === newPlan) {
      return NextResponse.json(
        { error: 'Ya tienes este plan' },
        { status: 400 }
      );
    }

    // Activar plan directamente (Stripe omitido para este entorno)
    await db.collection('advertisers').doc(advertiser.id).update({
      plan: newPlan,
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: null,
      message: 'Plan activado directamente (Stripe omitido)',
    });
  } catch (error: any) {
    console.error('Error changing plan:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


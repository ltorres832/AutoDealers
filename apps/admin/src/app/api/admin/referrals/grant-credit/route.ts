import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { createRewardCredit } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const adminUser = await db.collection('admin_users').doc(auth.userId).get();
    if (!adminUser.exists) {
      return NextResponse.json(
        { error: 'Usuario admin no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos de admin (todos los admins pueden gestionar referidos por ahora)

    const body = await request.json();
    const { userId, type, expiresInDays } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Los créditos de banners NO tienen expiración hasta que se usen
    // Los créditos de promociones nunca expiran
    // Si se especifica expiresInDays, solo se usa para otros tipos de créditos especiales
    let expiresAt: admin.firestore.Timestamp | undefined;
    // Por ahora, no establecer expiración inicial para ningún crédito
    // La expiración se maneja cuando se usa (7 días para banners)

    const credit = await createRewardCredit(
      userId,
      type as 'promotion' | 'banner',
      'admin_grant',
      undefined,
      expiresAt
    );

    // Actualizar contadores del usuario
    const userData = userDoc.data() || {};
    const currentRewards = userData.activeRewards || {};
    
    if (type === 'promotion') {
      await userDoc.ref.update({
        activeRewards: {
          ...currentRewards,
          promotionCredits: (currentRewards.promotionCredits || 0) + 1,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);
    } else if (type === 'banner') {
      await userDoc.ref.update({
        activeRewards: {
          ...currentRewards,
          bannerCredits: (currentRewards.bannerCredits || 0) + 1,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);
    }

    return NextResponse.json({
      success: true,
      credit: {
        id: credit.id,
        type: credit.type,
        expiresAt: credit.expiresAt?.toDate().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error granting credit:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


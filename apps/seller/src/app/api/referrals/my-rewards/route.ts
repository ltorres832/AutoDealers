import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { getAvailableCredits } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'seller') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener recompensas activas del usuario
    const userDoc = await db.collection('users').doc(auth.userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};
    const activeRewards = userData.activeRewards || {
      nextMonthDiscount: 0,
      freeMonthsRemaining: 0,
      promotionCredits: 0,
      bannerCredits: 0,
    };

    // Obtener créditos disponibles
    const promotionCredits = await getAvailableCredits(auth.userId, 'promotion');
    const bannerCredits = await getAvailableCredits(auth.userId, 'banner');

    // Obtener estadísticas de referidos
    const { getReferralsByUser } = await import('@autodealers/core');
    const referrals = await getReferralsByUser(auth.userId);
    
    const referralStats = {
      totalReferred: referrals.length,
      totalRewarded: referrals.filter(r => r.status === 'rewarded').length,
      pendingRewards: referrals.filter(r => r.status === 'pending' || r.status === 'confirmed').length,
    };

    return NextResponse.json({
      activeRewards: {
        nextMonthDiscount: activeRewards.nextMonthDiscount || 0,
        freeMonthsRemaining: activeRewards.freeMonthsRemaining || 0,
        promotionCredits: promotionCredits.length,
        bannerCredits: bannerCredits.length,
      },
      credits: {
        promotions: promotionCredits.map((c) => ({
          id: c.id,
          expiresAt: c.expiresAt?.toDate().toISOString(),
        })),
        banners: bannerCredits.map((c) => ({
          id: c.id,
          expiresAt: c.expiresAt?.toDate().toISOString(),
        })),
      },
      stats: referralStats,
    });
  } catch (error: any) {
    console.error('Error getting rewards:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


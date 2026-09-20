import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/shared';
// import { hasAdminPermission } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const snapshot = await db
      .collection('referrals')
      .orderBy('createdAt', 'desc')
      .limit(Math.min(limit, 500))
      .get();

    let referrals = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString(),
        confirmedAt: data.confirmedAt?.toDate().toISOString(),
        rewardsGrantedAt: data.rewardsGrantedAt?.toDate().toISOString(),
        paymentDate: data.paymentDate?.toDate().toISOString(),
      };
    });

    if (status) {
      referrals = referrals.filter((r) => r.status === status);
    }
    if (userId) {
      referrals = referrals.filter((r) => r.referrerId === userId);
    }

    // Estadísticas generales
    const allReferralsSnapshot = await db.collection('referrals').get();
    const stats = {
      total: allReferralsSnapshot.size,
      pending: allReferralsSnapshot.docs.filter((d) => d.data().status === 'pending').length,
      confirmed: allReferralsSnapshot.docs.filter((d) => d.data().status === 'confirmed').length,
      rewarded: allReferralsSnapshot.docs.filter((d) => d.data().status === 'rewarded').length,
      cancelled: allReferralsSnapshot.docs.filter((d) => d.data().status === 'cancelled').length,
    };

    return NextResponse.json({
      referrals,
      stats,
    });
  } catch (error: any) {
    console.error('Error getting referrals:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


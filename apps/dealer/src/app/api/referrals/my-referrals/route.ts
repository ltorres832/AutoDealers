import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getReferralsByUser } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'dealer') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const referrals = await getReferralsByUser(auth.userId);

    return NextResponse.json({
      referrals: referrals.map((ref) => ({
        id: ref.id,
        referredEmail: ref.referredEmail,
        membershipType: ref.membershipType,
        userType: ref.userType,
        status: ref.status,
        rewardStatus: ref.rewardStatus,
        createdAt: ref.createdAt.toDate().toISOString(),
        confirmedAt: ref.confirmedAt?.toDate().toISOString(),
        rewardsGrantedAt: ref.rewardsGrantedAt?.toDate().toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Error getting referrals:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getReferralCode } from '@autodealers/core';
import { buildDealerReferralRegisterLink } from '@/lib/referral-register-url';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || !isDealerPortalRole(auth.role)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const code = await getReferralCode(auth.userId);
    if (!code) {
      return NextResponse.json(
        { error: 'No se pudo generar el código de referido' },
        { status: 500 }
      );
    }

    const referralLink = buildDealerReferralRegisterLink(request, code);

    return NextResponse.json({
      code,
      link: referralLink,
    });
  } catch (error: any) {
    console.error('Error getting referral code:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


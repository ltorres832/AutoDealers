import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getReferralCode } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'dealer') {
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

    const baseUrl = request.nextUrl.origin.replace('app.', '');
    const referralLink = `${baseUrl}/register/dealer?ref=${code}`;

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


import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdvertiserById } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (!auth || auth.role !== 'advertiser') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const advertiser = await getAdvertiserById(auth.userId);

    if (!advertiser) {
      return NextResponse.json(
        { error: 'Anunciante no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      advertiser: {
        id: advertiser.id,
        email: advertiser.email,
        companyName: advertiser.companyName,
        contactName: advertiser.contactName,
        plan: advertiser.plan,
        status: advertiser.status,
      },
    });
  } catch (error: any) {
    console.error('Error fetching advertiser:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}


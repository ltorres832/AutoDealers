import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Buscar el banner
    const bannersSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('premium_banners')
      .where('stripeCheckoutSessionId', '==', sessionId)
      .limit(1)
      .get();

    if (bannersSnapshot.empty) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const bannerData = bannersSnapshot.docs[0].data();
    const banner = {
      id: bannersSnapshot.docs[0].id,
      ...bannerData,
      expiresAt: bannerData.expiresAt?.toDate()?.toISOString(),
      createdAt: bannerData.createdAt?.toDate()?.toISOString(),
    };

    return NextResponse.json({ 
      success: true,
      banner 
    });
  } catch (error: any) {
    console.error('Error verifying banner payment:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



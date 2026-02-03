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

    // Buscar la solicitud de promoción pagada
    const requestsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('paid_promotion_requests')
      .where('stripeCheckoutSessionId', '==', sessionId)
      .limit(1)
      .get();

    if (requestsSnapshot.empty) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = requestsSnapshot.docs[0].data();
    
    // Buscar la promoción activada
    const promotionsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('promotions')
      .where('paymentId', '==', sessionId)
      .where('isPaid', '==', true)
      .limit(1)
      .get();

    if (promotionsSnapshot.empty) {
      // Aún no se ha activado, el webhook está procesando
      return NextResponse.json({ 
        success: false,
        message: 'Payment is being processed'
      });
    }

    const promotionData = promotionsSnapshot.docs[0].data();
    const promotion = {
      id: promotionsSnapshot.docs[0].id,
      ...promotionData,
      expiresAt: promotionData.expiresAt?.toDate()?.toISOString(),
    };

    return NextResponse.json({ 
      success: true,
      promotion 
    });
  } catch (error: any) {
    console.error('Error verifying paid promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



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
    const type = searchParams.get('type'); // 'promotion' | 'banner' | 'all'

    // Obtener recibos de pagos
    const receiptsSnapshot = await db
      .collection('receipts')
      .where('tenantId', '==', auth.tenantId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const receipts = receiptsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString(),
      };
    });

    // Obtener solicitudes de promociones pagadas
    const promotionRequestsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('paid_promotion_requests')
      .orderBy('requestedAt', 'desc')
      .limit(100)
      .get();

    const promotionPayments = promotionRequestsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'promotion',
        description: `Promoción ${data.promotionScope} - ${data.duration} días`,
        amount: data.price,
        status: data.status,
        createdAt: data.requestedAt?.toDate()?.toISOString(),
        paidAt: data.completedAt?.toDate()?.toISOString(),
        stripeCheckoutSessionId: data.stripeCheckoutSessionId,
      };
    });

    // Obtener solicitudes de banners premium
    const bannerRequestsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('premium_banners')
      .where('paid', '==', true)
      .orderBy('paidAt', 'desc')
      .limit(100)
      .get();

    const bannerPayments = bannerRequestsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'banner',
        description: `Banner Premium: ${data.title} - ${data.duration} días`,
        amount: data.price,
        status: data.status,
        createdAt: data.createdAt?.toDate()?.toISOString(),
        paidAt: data.paidAt?.toDate()?.toISOString(),
        stripeCheckoutSessionId: data.stripeCheckoutSessionId,
      };
    });

    // Combinar todos los pagos
    let allPayments = [...promotionPayments, ...bannerPayments];

    // Filtrar por tipo si se especifica
    if (type && type !== 'all') {
      allPayments = allPayments.filter(p => p.type === type);
    }

    // Ordenar por fecha
    allPayments.sort((a, b) => {
      const dateA = new Date(a.paidAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.paidAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ payments: allPayments });
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



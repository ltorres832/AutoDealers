export const dynamic = 'force-dynamic';

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

    // Obtener todas las promociones premium del tenant
    const promotionsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('promotions')
      .where('isPremium', '==', true)
      .get();

    const promotions = promotionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        type: data.type,
        discount: data.discount,
        price: data.price,
        status: data.status,
        startDate: data.startDate?.toDate()?.toISOString(),
        endDate: data.endDate?.toDate()?.toISOString(),
        platforms: data.platforms || [],
        content: data.content,
        imageUrl: data.imageUrl,
        createdAt: data.createdAt?.toDate()?.toISOString(),
      };
    });

    // Obtener solicitudes de promociones premium
    const requestsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('premium_promotion_requests')
      .get();

    const requests = requestsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        promotionId: data.promotionId,
        status: data.status,
        requestedAt: data.requestedAt?.toDate()?.toISOString(),
        price: data.price,
      };
    });

    return NextResponse.json({
      promotions,
      requests,
    });
  } catch (error: any) {
    console.error('Error fetching premium promotions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



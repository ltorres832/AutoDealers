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

    // Obtener promociones asignadas pendientes de pago
    const assignedPromotionsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('paid_promotion_requests')
      .where('status', '==', 'assigned')
      .where('paymentStatus', '==', 'pending')
      .orderBy('assignedAt', 'desc')
      .get();

    const promotions = assignedPromotionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || `Promoción ${data.promotionScope} - ${data.duration} días`,
        description: data.description || '',
        promotionScope: data.promotionScope,
        vehicleId: data.vehicleId || null,
        duration: data.duration,
        price: data.price,
        status: data.status,
        paymentStatus: data.paymentStatus,
        assignedAt: data.assignedAt?.toDate()?.toISOString(),
      };
    });

    return NextResponse.json({ promotions });
  } catch (error: any) {
    console.error('Error fetching assigned promotions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/shared';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const col = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('paid_promotion_requests');

    let snap;
    try {
      snap = await col
        .where('status', '==', 'assigned')
        .where('paymentStatus', '==', 'pending')
        .orderBy('assignedAt', 'desc')
        .get();
    } catch (e: any) {
      // Sin índice compuesto: degrada a filtro en memoria
      console.warn('promotions/assigned index fallback', e?.message || e);
      snap = await col.where('status', '==', 'assigned').limit(100).get();
    }

    const promotions = snap.docs
      .map((doc) => {
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
          assignedAt: data.assignedAt?.toDate?.()?.toISOString?.() || data.assignedAt || null,
        };
      })
      .filter((p) => p.paymentStatus === 'pending')
      .sort((a, b) => String(b.assignedAt || '').localeCompare(String(a.assignedAt || '')));

    return NextResponse.json({ promotions });
  } catch (error: any) {
    console.error('Error fetching assigned promotions:', error);
    return NextResponse.json({ promotions: [], error: error.message });
  }
}

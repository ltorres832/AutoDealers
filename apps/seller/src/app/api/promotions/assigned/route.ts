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

    // Obtener promociones asignadas al seller (status = 'assigned' y paymentStatus = 'pending')
    const promotionsSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('promotions')
      .where('status', '==', 'assigned')
      .where('paymentStatus', '==', 'pending')
      .where('assignedTo', '==', auth.userId)
      .get();

    const promotions = promotionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString(),
        expiresAt: data.expiresAt?.toDate()?.toISOString(),
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



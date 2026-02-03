export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || auth.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const acceptancesSnapshot = await db.collection('policy_acceptances')
      .where('userId', '==', userId)
      .orderBy('acceptedAt', 'desc')
      .get();

    const acceptances = await Promise.all(
      acceptancesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Obtener información de la política
        const policyDoc = await db.collection('policies').doc(data.policyId).get();
        const policyData = policyDoc.exists ? policyDoc.data() : null;

        return {
          id: doc.id,
          policyId: data.policyId,
          policyTitle: policyData?.title || 'Política eliminada',
          policyVersion: data.policyVersion,
          acceptedAt: data.acceptedAt?.toDate().toISOString() || new Date().toISOString(),
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        };
      })
    );

    return NextResponse.json({ acceptances });
  } catch (error: any) {
    console.error('Error fetching policy history:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener historial' },
      { status: 500 }
    );
  }
}



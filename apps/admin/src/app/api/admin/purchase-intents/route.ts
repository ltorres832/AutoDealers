export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const fraudLevel = searchParams.get('fraudLevel');

    // Obtener todos los purchase intents de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    const allIntents: any[] = [];

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('purchase_intents')
        .orderBy('createdAt', 'desc');

      if (status && status !== 'all') {
        query = query.where('status', '==', status) as any;
      }

      const snapshot = await query.get();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        
        // Filtrar por nivel de fraude si se especifica
        if (fraudLevel && fraudLevel !== 'all') {
          const score = data.fraudScore || 0;
          if (fraudLevel === 'low' && score >= 31) return;
          if (fraudLevel === 'medium' && (score < 31 || score >= 61)) return;
          if (fraudLevel === 'high' && score < 61) return;
        }

        allIntents.push({
          id: doc.id,
          tenantId,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          verifiedAt: data.verifiedAt?.toDate()?.toISOString(),
        });
      });
    }

    // Ordenar por fecha de creación (más recientes primero)
    allIntents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ intents: allIntents });
  } catch (error: any) {
    console.error('Error fetching purchase intents:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener purchase intents' },
      { status: 500 }
    );
  }
}



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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    // Obtener todos los banners de todos los tenants
    let query = db.collectionGroup('premium_banners') as any;
    
    if (status) {
      query = query.where('status', '==', status);
    }

    const bannersSnapshot = await query.orderBy('createdAt', 'desc').get();

    const banners = [];
    const tenantCache: Record<string, string> = {};

    for (const doc of bannersSnapshot.docs) {
      const data = doc.data();
      
      // Obtener tenantId del path
      const pathParts = doc.ref.path.split('/');
      const tenantId = pathParts[1];

      // Obtener nombre del tenant (con cache)
      let tenantName = tenantCache[tenantId];
      if (!tenantName) {
        try {
          const tenantDoc = await db.collection('tenants').doc(tenantId).get();
          if (tenantDoc.exists) {
            tenantName = tenantDoc.data()?.name || 'Concesionario';
            tenantCache[tenantId] = tenantName;
          } else {
            tenantName = 'Concesionario';
          }
        } catch (error) {
          tenantName = 'Concesionario';
        }
      }

      banners.push({
        id: doc.id,
        tenantId,
        tenantName,
        ...data,
        expiresAt: data.expiresAt?.toDate()?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
      });
    }

    return NextResponse.json({ banners });
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



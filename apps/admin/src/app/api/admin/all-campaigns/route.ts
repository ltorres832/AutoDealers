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

    let campaigns: any[] = [];

    // Obtener todas las campañas de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();

      const campaignsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('campaigns')
        .get();
      
      campaignsSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        campaigns.push({
          id: doc.id,
          tenantId,
          tenantName: tenantData.name,
          name: data.name || 'Sin nombre',
          type: data.type || 'ad',
          platforms: data.platforms || [],
          status: data.status || 'draft',
          budgets: data.budgets || [],
          metrics: data.metrics || {
            impressions: 0,
            clicks: 0,
            leads: 0,
            spend: 0,
          },
          createdAt: data?.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        });
      });
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching all campaigns:', error);
    return NextResponse.json({ campaigns: [] });
  }
}

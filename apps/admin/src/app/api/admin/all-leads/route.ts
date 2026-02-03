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
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const search = searchParams.get('search');

    let leads: any[] = [];

    // Obtener todos los leads de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId_ = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      // Si hay filtro de tenant, solo buscar en ese tenant
      if (tenantId && tenantId_ !== tenantId) continue;

      let leadsQuery: any = db
        .collection('tenants')
        .doc(tenantId_)
        .collection('leads');

      if (status) {
        leadsQuery = leadsQuery.where('status', '==', status);
      }
      if (source) {
        leadsQuery = leadsQuery.where('source', '==', source);
      }

      const leadsSnapshot = await leadsQuery.get();
      
      leadsSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        leads.push({
          id: doc.id,
          tenantId: tenantId_,
          tenantName: tenantData.name,
          ...data,
          createdAt: data?.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        });
      });
    }

    // Filtrar por búsqueda si existe
    if (search) {
      const searchLower = search.toLowerCase();
      leads = leads.filter(
        (lead) =>
          lead.contact?.name?.toLowerCase().includes(searchLower) ||
          lead.contact?.email?.toLowerCase().includes(searchLower) ||
          lead.contact?.phone?.includes(search)
      );
    }

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Error fetching all leads:', error);
    return NextResponse.json({ leads: [] });
  }
}

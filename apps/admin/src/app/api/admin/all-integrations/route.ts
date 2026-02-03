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

    let integrations: any[] = [];

    // Obtener todas las integraciones de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();

      const integrationsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .get();
      
      integrationsSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const integrationType = data.type || 'unknown';
        
        // Obtener nombre de la cuenta/página según el tipo de integración
        let accountName = 'Sin nombre';
        if (integrationType === 'facebook' && data.credentials?.pageName) {
          accountName = data.credentials.pageName;
        } else if (integrationType === 'instagram' && data.credentials?.instagramUsername) {
          accountName = `@${data.credentials.instagramUsername}`;
        } else if (integrationType === 'whatsapp' && data.credentials?.phoneNumber) {
          accountName = data.credentials.phoneNumber;
        } else if (data.credentials?.name) {
          accountName = data.credentials.name;
        }
        
        integrations.push({
          id: doc.id,
          tenantId,
          tenantName: tenantData.name || tenantId,
          platform: integrationType,
          accountName: accountName,
          status: data.status || 'inactive',
          createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt || new Date().toISOString(),
          updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
        });
      });
    }

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error('Error fetching all integrations:', error);
    return NextResponse.json({ integrations: [] });
  }
}

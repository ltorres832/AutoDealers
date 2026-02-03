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
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let sales: any[] = [];

    // Obtener todas las ventas de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId_ = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      // Si hay filtro de tenant, solo buscar en ese tenant
      if (tenantId && tenantId_ !== tenantId) continue;

      let salesQuery: any = db
        .collection('tenants')
        .doc(tenantId_)
        .collection('sales');

      if (status) {
        salesQuery = salesQuery.where('status', '==', status);
      }

      const salesSnapshot = await salesQuery.get();
      
      salesSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const saleDate = data?.createdAt?.toDate() || new Date();
        
        // Filtrar por fecha si existe
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (saleDate < fromDate) return;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (saleDate > toDate) return;
        }

        sales.push({
          id: doc.id,
          tenantId: tenantId_,
          tenantName: tenantData.name,
          customerName: data.customer?.name || data.customerName || 'N/A',
          vehicleYear: data.vehicle?.year || data.vehicleYear || 0,
          vehicleMake: data.vehicle?.make || data.vehicleMake || 'N/A',
          vehicleModel: data.vehicle?.model || data.vehicleModel || 'N/A',
          price: data.price || 0,
          status: data.status || 'pending',
          createdAt: saleDate.toISOString(),
        });
      });
    }

    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Error fetching all sales:', error);
    return NextResponse.json({ sales: [] });
  }
}

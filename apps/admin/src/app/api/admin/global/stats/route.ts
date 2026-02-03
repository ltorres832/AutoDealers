export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getFirestore } from '@autodealers/core';

export async function GET(request: NextRequest) {
  // SIEMPRE retornar stats, incluso si hay error
  const defaultStats = {
    totalUsers: 0,
    totalTenants: 0,
    totalVehicles: 0,
    totalLeads: 0,
    totalSales: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
  };

  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      // Retornar stats por defecto en lugar de error 401
      return NextResponse.json({ stats: defaultStats });
    }

    try {
      const db = getFirestore();

      // Obtener todas las estadísticas en paralelo con timeout
      const statsPromise = Promise.all([
        db.collection('users').get().catch(() => ({ size: 0, docs: [] })),
        db.collection('tenants').get().catch(() => ({ size: 0, docs: [] })),
        db.collectionGroup('vehicles').get().catch(() => ({ size: 0, docs: [] })),
        db.collectionGroup('leads').get().catch(() => ({ size: 0, docs: [] })),
        db.collectionGroup('sales').get().catch(() => ({ size: 0, docs: [] })),
        db.collection('subscriptions').where('status', '==', 'active').get().catch(() => ({ size: 0, docs: [] })),
      ]);

      // Timeout de 8 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000)
      );

      const [
        usersSnapshot,
        tenantsSnapshot,
        vehiclesSnapshot,
        leadsSnapshot,
        salesSnapshot,
        subscriptionsSnapshot,
      ] = await Promise.race([statsPromise, timeoutPromise]) as any[];

      // Calcular revenue total
      let totalRevenue = 0;
      let monthlyRevenue = 0;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      salesSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        if (data.status === 'completed') {
          totalRevenue += data.price || 0;
          
          const saleDate = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000) || new Date();
          if (saleDate >= startOfMonth) {
            monthlyRevenue += data.price || 0;
          }
        }
      });

      const stats = {
        totalUsers: usersSnapshot.size || 0,
        totalTenants: tenantsSnapshot.size || 0,
        totalVehicles: vehiclesSnapshot.size || 0,
        totalLeads: leadsSnapshot.size || 0,
        totalSales: salesSnapshot.docs.filter(
          (doc: any) => doc.data()?.status === 'completed'
        ).length || 0,
        totalRevenue,
        activeSubscriptions: subscriptionsSnapshot.size || 0,
        monthlyRevenue,
      };

      return NextResponse.json({ stats });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      // Retornar stats por defecto si hay error de DB
      return NextResponse.json({ stats: defaultStats });
    }
  } catch (error: any) {
    console.error('Error fetching global stats:', error);
    // SIEMPRE retornar stats, nunca error
    return NextResponse.json({ stats: defaultStats });
  }
}


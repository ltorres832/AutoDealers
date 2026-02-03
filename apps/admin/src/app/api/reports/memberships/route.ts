export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    // Calcular fechas según período
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();

    // Obtener todos los tenants con sus membresías
    const tenantsSnapshot = await db.collection('tenants').get();
    
    let totalTenants = 0;
    const byMembership: Record<string, number> = { free: 0, basic: 0, premium: 0 };
    const byStatus: Record<string, number> = { active: 0, inactive: 0 };
    const revenueByMembership: Record<string, number> = { free: 0, basic: 0, premium: 0 };
    const byMonth: Record<string, { count: number; revenue: number }> = {};
    
    tenantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000 || Date.now());
      
      if (createdAt >= startDate && createdAt <= endDate) {
        totalTenants++;
        
        // Por tipo de membresía
        const membership = data.membership || 'free';
        byMembership[membership] = (byMembership[membership] || 0) + 1;
        
        // Por estado
        const status = data.status || 'active';
        byStatus[status] = (byStatus[status] || 0) + 1;
        
        // Revenue por membresía (estimado)
        const monthlyRevenue = membership === 'premium' ? 99 : membership === 'basic' ? 49 : 0;
        revenueByMembership[membership] += monthlyRevenue;
        
        // Por mes
        const monthKey = createdAt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = { count: 0, revenue: 0 };
        }
        byMonth[monthKey].count++;
        byMonth[monthKey].revenue += monthlyRevenue;
      }
    });
    
    const totalRevenue = Object.values(revenueByMembership).reduce((a, b) => a + b, 0);
    
    const report = {
      totalTenants,
      byMembership,
      byStatus,
      revenueByMembership,
      totalRevenue,
      byMonth,
      averageRevenuePerTenant: totalTenants > 0 ? totalRevenue / totalTenants : 0,
    };
    
    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Error generating memberships report:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        report: {
          totalTenants: 0,
          byMembership: { free: 0, basic: 0, premium: 0 },
          byStatus: { active: 0, inactive: 0 },
          revenueByMembership: { free: 0, basic: 0, premium: 0 },
          totalRevenue: 0,
          byMonth: {},
          averageRevenuePerTenant: 0,
        }
      },
      { status: 500 }
    );
  }
}


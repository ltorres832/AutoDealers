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

    // Obtener campaigns
    const campaignsSnapshot = await db.collectionGroup('campaigns').get();
    
    let totalCampaigns = 0;
    const byType: Record<string, number> = { standard: 0, premium: 0 };
    const byStatus: Record<string, number> = { active: 0, completed: 0, scheduled: 0 };
    const byMonth: Record<string, number> = {};
    
    campaignsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000 || Date.now());
      
      if (createdAt >= startDate && createdAt <= endDate) {
        totalCampaigns++;
        
        const type = data.isPremium ? 'premium' : 'standard';
        byType[type] = (byType[type] || 0) + 1;
        
        const status = data.status || 'active';
        byStatus[status] = (byStatus[status] || 0) + 1;
        
        const monthKey = createdAt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
      }
    });

    // Obtener premium promotion requests
    const promotionsSnapshot = await db.collectionGroup('premiumPromotionRequests').get();
    
    let totalPromotions = 0;
    let totalPromotionRevenue = 0;
    const promotionsByStatus: Record<string, number> = { pending: 0, paid: 0, active: 0, completed: 0 };
    const promotionsByMonth: Record<string, { count: number; revenue: number }> = {};
    
    promotionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt?.seconds * 1000 || Date.now());
      
      if (createdAt >= startDate && createdAt <= endDate) {
        totalPromotions++;
        
        const status = data.status || 'pending';
        promotionsByStatus[status] = (promotionsByStatus[status] || 0) + 1;
        
        const revenue = data.amount || 0;
        totalPromotionRevenue += revenue;
        
        const monthKey = createdAt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
        if (!promotionsByMonth[monthKey]) {
          promotionsByMonth[monthKey] = { count: 0, revenue: 0 };
        }
        promotionsByMonth[monthKey].count++;
        promotionsByMonth[monthKey].revenue += revenue;
      }
    });
    
    const report = {
      campaigns: {
        total: totalCampaigns,
        byType,
        byStatus,
        byMonth,
      },
      premiumPromotions: {
        total: totalPromotions,
        byStatus: promotionsByStatus,
        byMonth: promotionsByMonth,
        totalRevenue: totalPromotionRevenue,
        averageRevenue: totalPromotions > 0 ? totalPromotionRevenue / totalPromotions : 0,
      },
    };
    
    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Error generating promotions report:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        report: {
          campaigns: {
            total: 0,
            byType: { standard: 0, premium: 0 },
            byStatus: { active: 0, completed: 0, scheduled: 0 },
            byMonth: {},
          },
          premiumPromotions: {
            total: 0,
            byStatus: { pending: 0, paid: 0, active: 0, completed: 0 },
            byMonth: {},
            totalRevenue: 0,
            averageRevenue: 0,
          },
        }
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getSellerNetworkActivity } from '@/lib/seller-network-activity';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerFilter = request.nextUrl.searchParams.get('dealerId') || undefined;

    const network = await getSellerNetworkActivity(auth.tenantId, {
      userId: auth.userId,
      dealerIds: dealerFilter ? [dealerFilter] : undefined,
      kinds: ['leads', 'sales', 'appointments', 'campaigns', 'promotions', 'social', 'sellers'],
      limitPerSeller: 15,
    });

    const activities = network.summaryBySeller.map((summary) => {
      const sellerId = summary.sellerId;
      return {
        sellerId,
        sellerName: summary.sellerName,
        sellerEmail: summary.sellerEmail,
        stats: {
          totalLeads: summary.totalLeads,
          activeLeads: summary.activeLeads,
          totalSales: summary.totalSales,
          totalRevenue: summary.totalRevenue,
          totalAppointments: network.appointments.filter((a) => a.ownerId === sellerId).length,
          totalCampaigns: summary.totalCampaigns,
          totalPromotions: summary.totalPromotions,
          totalSocialPosts: summary.totalSocialPosts,
          scheduledSocialPosts: summary.scheduledSocialPosts,
        },
        recentLeads: network.leads.filter((l) => l.ownerId === sellerId).slice(0, 10),
        recentSales: network.sales.filter((s) => s.ownerId === sellerId).slice(0, 10),
        recentAppointments: network.appointments.filter((a) => a.ownerId === sellerId).slice(0, 10),
        recentCampaigns: network.campaigns.filter((c) => c.ownerId === sellerId).slice(0, 10),
        recentPromotions: network.promotions.filter((p) => p.ownerId === sellerId).slice(0, 10),
        recentSocialPosts: network.social.filter((p) => p.ownerId === sellerId).slice(0, 10),
      };
    });

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Error fetching sellers activity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, activities: [] },
      { status: 500 }
    );
  }
}

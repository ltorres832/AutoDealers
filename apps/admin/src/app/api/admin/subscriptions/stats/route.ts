export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSubscriptionStats } from '@autodealers/billing';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getSubscriptionStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return NextResponse.json(
      { stats: { total: 0, active: 0, pastDue: 0, suspended: 0, cancelled: 0, revenue: 0 } },
      { status: 200 }
    );
  }
}






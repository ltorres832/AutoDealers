import { NextRequest, NextResponse } from 'next/server';
import { generateLeadsReport } from '@autodealers/reports';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const scope = searchParams.get('scope') || 'global';
    const dealerId = searchParams.get('dealerId') || undefined;
    const sellerId = searchParams.get('sellerId') || undefined;

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

    const report = await generateLeadsReport(auth.tenantId, {
      startDate,
      endDate,
      scope: scope as 'global' | 'dealer' | 'seller',
      dealerId,
      sellerId,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error generating leads report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




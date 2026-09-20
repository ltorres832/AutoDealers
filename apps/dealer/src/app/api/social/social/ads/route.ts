import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAdCampaigns } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const campaigns = await getAdCampaigns(auth.tenantId, auth.userId);
      return NextResponse.json({ campaigns: campaigns || [] });
    } catch (e: any) {
      console.warn('social/ads fallback', e?.message || e);
      return NextResponse.json({ campaigns: [], warning: e?.message || 'index_or_query' });
    }
  } catch (error: any) {
    console.error('Error fetching ad campaigns:', error);
    return NextResponse.json({ campaigns: [], error: error.message });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { startAdCampaign } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const result = await startAdCampaign(auth.tenantId, campaignId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to start campaign' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ...result, success: true });
  } catch (error: any) {
    console.error('Error starting ad campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createCampaign, getCampaigns } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const campaigns = await getCampaigns(auth.tenantId, {
      status: status as any,
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const campaign = await createCampaign({
      tenantId: auth.tenantId,
      name: body.name,
      description: body.description,
      type: body.type,
      platforms: body.platforms,
      budgets: body.budgets,
      content: body.content,
      schedule: body.schedule,
      status: body.status || 'draft',
      aiGenerated: body.aiGenerated || false,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}






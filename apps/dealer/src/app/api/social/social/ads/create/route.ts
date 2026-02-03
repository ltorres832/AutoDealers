import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createAdCampaign } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, objective, vehicleId, profileId, budget, dailyBudget, duration, platforms } = body;

    if (!name || !objective || !budget || !duration || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!vehicleId && !profileId) {
      return NextResponse.json(
        { error: 'Either vehicleId or profileId is required' },
        { status: 400 }
      );
    }

    const campaign = await createAdCampaign({
      tenantId: auth.tenantId,
      userId: auth.userId,
      name,
      objective,
      vehicleId,
      profileId,
      budget,
      dailyBudget,
      duration,
      platforms,
      status: 'draft',
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ad campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { schedulePost } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, platforms, scheduledFor, vehicleId, promotionId, aiGenerated } = body;

    if (!content || !platforms || !scheduledFor) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const scheduledPost = await schedulePost({
      tenantId: auth.tenantId,
      userId: auth.userId,
      content,
      platforms,
      scheduledFor: new Date(scheduledFor),
      vehicleId,
      promotionId,
      aiGenerated: aiGenerated || false,
    });

    return NextResponse.json({ post: scheduledPost }, { status: 201 });
  } catch (error: any) {
    console.error('Error scheduling post:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


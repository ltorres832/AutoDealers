import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { schedulePost, PLATFORM_SOCIAL_TENANT_ID } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin' || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, platforms, scheduledFor, vehicleId, aiGenerated } = body;

    if (!content || !platforms || !scheduledFor) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const scheduledPost = await schedulePost({
      tenantId: PLATFORM_SOCIAL_TENANT_ID,
      userId: auth.userId,
      content,
      platforms,
      scheduledFor: new Date(scheduledFor),
      vehicleId,
      aiGenerated: aiGenerated || false,
    });

    return NextResponse.json({ post: scheduledPost }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

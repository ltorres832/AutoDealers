import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { registerFcmToken, unregisterFcmToken } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const token = String(body.token || '').trim();
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    await registerFcmToken(auth.userId, token, {
      platform: body.platform || 'web',
      userAgent: body.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const token = String(body.token || '').trim();
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    await unregisterFcmToken(auth.userId, token);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unregistering FCM token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

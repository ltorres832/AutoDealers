import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { pauseScheduledPost, reactivateScheduledPost } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postId, action } = body; // action: 'pause' | 'reactivate'

    if (!postId || !action) {
      return NextResponse.json(
        { error: 'postId and action are required' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'pause') {
      result = await pauseScheduledPost(auth.tenantId, postId);
    } else if (action === 'reactivate') {
      result = await reactivateScheduledPost(auth.tenantId, postId);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "pause" or "reactivate"' },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update post' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating scheduled post:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


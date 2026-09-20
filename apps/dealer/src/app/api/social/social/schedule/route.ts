import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getScheduledPosts } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;

    try {
      const posts = await getScheduledPosts(auth.tenantId, auth.userId, status);
      return NextResponse.json({ posts: posts || [] });
    } catch (e: any) {
      console.warn('social/schedule fallback', e?.message || e);
      return NextResponse.json({ posts: [], warning: e?.message || 'index_or_query' });
    }
  } catch (error: any) {
    console.error('Error fetching scheduled posts:', error);
    return NextResponse.json({ posts: [], error: error.message });
  }
}

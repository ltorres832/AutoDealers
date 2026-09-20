import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/shared';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status') || 'published';

    const db = getFirestore();
    const col = db.collection('tenants').doc(auth.tenantId).collection('social_posts');

    let snapshot;
    try {
      snapshot = await col.where('status', '==', status).orderBy('publishedAt', 'desc').limit(limit).get();
    } catch (e: any) {
      console.warn('social/posts index fallback', e?.message || e);
      snapshot = await col.where('status', '==', status).limit(Math.max(limit, 50)).get();
    }

    const posts = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          media: data.media || [],
          platforms: data.platforms || [],
          publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() || data.publishedAt || null,
          metadata: data.metadata || {},
          aiGenerated: data.aiGenerated || false,
          status: data.status,
        };
      })
      .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
      .slice(0, limit);

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('Error fetching social posts:', error);
    return NextResponse.json({ posts: [], error: error.message });
  }
}

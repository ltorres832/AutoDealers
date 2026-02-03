import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'published';

    const db = getFirestore();
    let query = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('social_posts')
      .where('status', '==', status)
      .orderBy('publishedAt', 'desc')
      .limit(limit);

    const snapshot = await query.get();

    const posts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.content,
        media: data.media || [],
        platforms: data.platforms || [],
        publishedAt: data.publishedAt?.toDate?.()?.toISOString() || data.publishedAt,
        metadata: data.metadata || {},
        aiGenerated: data.aiGenerated || false,
        status: data.status,
      };
    });

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('Error fetching social posts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bannersSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('premium_banners')
      .orderBy('createdAt', 'desc')
      .get();

    const banners = bannersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        expiresAt: data.expiresAt?.toDate()?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
      };
    });

    return NextResponse.json({ banners });
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



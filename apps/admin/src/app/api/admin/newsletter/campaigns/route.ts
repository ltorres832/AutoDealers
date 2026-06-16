export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = Math.min(
      50,
      Math.max(1, Number(new URL(request.url).searchParams.get('limit') || 20))
    );

    const db = getFirestore();
    const snap = await db
      .collection('newsletter_campaigns')
      .orderBy('sentAt', 'desc')
      .limit(limit)
      .get();

    const campaigns = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        subject: d.subject,
        audience: d.audience,
        totalRecipients: d.totalRecipients,
        successful: d.successful,
        failed: d.failed,
        sentAt: d.sentAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    return NextResponse.json({ campaigns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

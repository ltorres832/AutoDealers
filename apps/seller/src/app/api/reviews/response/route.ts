import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { addReviewResponse } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reviewId, responseText } = body;

    if (!reviewId || !responseText) {
      return NextResponse.json(
        { error: 'reviewId y responseText son requeridos' },
        { status: 400 }
      );
    }

    const respondedBy = auth.userId || auth.email || 'Sistema';

    await addReviewResponse(auth.tenantId, reviewId, responseText, respondedBy);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding review response:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



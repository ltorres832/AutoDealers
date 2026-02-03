import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPreQualifications } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    const preQualifications = await getPreQualifications(auth.tenantId, {
      status: status as any,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ preQualifications });
  } catch (error: any) {
    console.error('Error fetching pre-qualifications:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



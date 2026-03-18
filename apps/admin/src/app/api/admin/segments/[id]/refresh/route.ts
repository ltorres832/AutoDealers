import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { calculateSegmentLeads } from '@autodealers/crm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const { id } = await params;
    await calculateSegmentLeads(tenantId, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error refreshing segment:', error);
    return NextResponse.json(
      { error: error.message || 'Error refreshing segment' },
      { status: 500 }
    );
  }
}

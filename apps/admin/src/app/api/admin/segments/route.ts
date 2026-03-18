import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSegments, createSegment } from '@autodealers/crm';

export async function GET(request: NextRequest) {
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

    const segments = await getSegments(tenantId);
    return NextResponse.json({ segments });
  } catch (error: any) {
    console.error('Error fetching segments:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching segments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, segment } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const newSegment = await createSegment(tenantId, segment);
    return NextResponse.json({ segment: newSegment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating segment:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating segment' },
      { status: 500 }
    );
  }
}

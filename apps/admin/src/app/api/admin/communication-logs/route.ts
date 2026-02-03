export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getCommunicationLogs } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as any;
    const status = searchParams.get('status') as any;
    const event = searchParams.get('event') as any;

    const logs = await getCommunicationLogs({
      type: type && type !== 'all' ? type : undefined,
      status: status && status !== 'all' ? status : undefined,
      event: event && event !== 'all' ? event : undefined,
      limit: 100,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching communication logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



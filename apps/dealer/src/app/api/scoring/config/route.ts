import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getScoringConfig, saveScoringConfig } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getScoringConfig(auth.tenantId);

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error fetching scoring config:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching scoring config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await saveScoringConfig(auth.tenantId, body);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving scoring config:', error);
    return NextResponse.json(
      { error: error.message || 'Error saving scoring config' },
      { status: 500 }
    );
  }
}


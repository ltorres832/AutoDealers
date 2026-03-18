import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getScoringConfig, saveScoringConfig } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

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

    const config = await getScoringConfig(tenantId);
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
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, config } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    await saveScoringConfig(tenantId, config);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving scoring config:', error);
    return NextResponse.json(
      { error: error.message || 'Error saving scoring config' },
      { status: 500 }
    );
  }
}

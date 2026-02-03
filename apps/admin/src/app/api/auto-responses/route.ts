export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createAutoResponse, getActiveAutoResponses } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const responses = await getActiveAutoResponses(auth.tenantId);

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('Error fetching auto responses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const response = await createAutoResponse({
      tenantId: auth.tenantId,
      name: body.name,
      trigger: body.trigger,
      response: body.response,
      channels: body.channels,
      isActive: body.isActive !== undefined ? body.isActive : true,
      priority: body.priority || 1,
    });

    return NextResponse.json({ response }, { status: 201 });
  } catch (error) {
    console.error('Error creating auto response:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}






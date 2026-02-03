import { NextRequest, NextResponse } from 'next/server';
import { toggleSubUserStatus } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    await toggleSubUserStatus(auth.tenantId, id, isActive);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling sub user status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






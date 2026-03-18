export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { completeTask } from '@autodealers/crm';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await completeTask(auth.tenantId, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

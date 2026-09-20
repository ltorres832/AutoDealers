import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { ensureVoiceProvisionedForTenant } from '@autodealers/voice';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tenants/[id]/provision-voice
 * Body opcional: { forceNewNumber?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;
    if (!tenantId || tenantId === 'undefined') {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    let forceNewNumber = false;
    try {
      const body = await request.json();
      forceNewNumber = body?.forceNewNumber === true;
    } catch {
      /* sin body */
    }

    const result = await ensureVoiceProvisionedForTenant(tenantId, {
      forceNewNumber,
      source: 'admin_provision',
      updatedBy: auth.userId,
    });

    return NextResponse.json({ success: result.ok || Boolean(result.skipped), result });
  } catch (e: any) {
    console.error('[admin provision-voice]', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e?.message },
      { status: 500 }
    );
  }
}

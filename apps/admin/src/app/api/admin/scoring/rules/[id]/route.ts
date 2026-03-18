import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getScoringConfig, saveScoringConfig } from '@autodealers/crm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const { id } = await params;
    const config = await getScoringConfig(tenantId);
    const updatedRules = (config.rules || []).map((rule) =>
      rule.id === id ? { ...rule, enabled: body.enabled } : rule
    );

    await saveScoringConfig(tenantId, { rules: updatedRules });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating scoring rule:', error);
    return NextResponse.json(
      { error: error.message || 'Error updating scoring rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const config = await getScoringConfig(tenantId);
    const updatedRules = (config.rules || []).filter((rule) => rule.id !== id);

    await saveScoringConfig(tenantId, { rules: updatedRules });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting scoring rule:', error);
    return NextResponse.json(
      { error: error.message || 'Error deleting scoring rule' },
      { status: 500 }
    );
  }
}

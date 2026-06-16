export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { deleteLead, getLeadById } from '@autodealers/crm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; leadId: string }> }
) {
  try {
    const auth = await verifyAuth(_request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, leadId } = await params;
    if (!tenantId?.trim() || !leadId?.trim()) {
      return NextResponse.json({ error: 'tenantId y leadId requeridos' }, { status: 400 });
    }

    const lead = await getLeadById(tenantId.trim(), leadId.trim());
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    await deleteLead(tenantId.trim(), leadId.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead (admin):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

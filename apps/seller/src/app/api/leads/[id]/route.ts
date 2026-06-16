import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { assertSellerLeadAccess } from '@/lib/seller-workspace';
import { updateLead, getLeadById, parseLeadPatchBody } from '@autodealers/crm';
import { getCrmPipelineSettings } from '@autodealers/core';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const body = await request.json();

    const lead = await getLeadById(auth.tenantId, leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const access = await assertSellerLeadAccess(auth, lead);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const pipeline = await getCrmPipelineSettings();
    const allowedStatuses = new Set(pipeline.stages.map((s) => s.status));

    const parsed = parseLeadPatchBody(body, lead, {
      allowedStatuses,
      allowAssignedTo: false,
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: parsed.statusCode });
    }

    if (Object.keys(parsed.updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    await updateLead(auth.tenantId, leadId, parsed.updates);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating lead:', error);
    const message = error instanceof Error ? error.message : 'Error updating lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const lead = await getLeadById(auth.tenantId, leadId);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const access = await assertSellerLeadAccess(auth, lead);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json({ lead });
  } catch (error: unknown) {
    console.error('Error fetching lead:', error);
    const message = error instanceof Error ? error.message : 'Error fetching lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const lead = await getLeadById(auth.tenantId, leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const access = await assertSellerLeadAccess(auth, lead);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { deleteLead } = await import('@autodealers/crm');
    await deleteLead(auth.tenantId, leadId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting lead:', error);
    const message = error instanceof Error ? error.message : 'Error deleting lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

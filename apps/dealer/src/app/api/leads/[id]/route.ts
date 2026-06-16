import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole, isSellerRole } from '@/lib/auth';
import { updateLead, getLeadById, parseLeadPatchBody, isSellerOwnedLead } from '@autodealers/crm';
import { getCrmPipelineSettings } from '@autodealers/core';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const body = await request.json();

    const lead = await getLeadById(auth.tenantId, leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verificar permisos
    if (auth.role === 'seller' && lead.assignedTo !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isDealerPortalRole(auth.role) && isSellerOwnedLead(lead) && 'assignedTo' in body) {
      return NextResponse.json(
        { error: 'Este lead es del vendedor; no se puede reasignar desde el concesionario' },
        { status: 403 }
      );
    }

    const pipeline = await getCrmPipelineSettings();
    const allowedStatuses = new Set(pipeline.stages.map((s) => s.status));

    const parsed = parseLeadPatchBody(body, lead, {
      allowedStatuses,
      allowAssignedTo: isDealerPortalRole(auth.role),
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
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const lead = await getLeadById(auth.tenantId, leadId);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verificar permisos
    if (auth.role === 'seller' && lead.assignedTo !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDealerPortalRole(auth.role) && !isSellerRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const lead = await getLeadById(auth.tenantId, leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (isSellerRole(auth.role) && lead.assignedTo !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isDealerPortalRole(auth.role) && isSellerOwnedLead(lead)) {
      return NextResponse.json(
        { error: 'Este lead pertenece al vendedor y no puede eliminarse desde el concesionario' },
        { status: 403 }
      );
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


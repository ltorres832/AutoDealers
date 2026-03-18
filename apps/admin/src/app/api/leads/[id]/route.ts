import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead, updateLeadStatus } from '@autodealers/crm';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const lead = await getLeadById(auth.tenantId, id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { status, assignedTo, notes } = body;

    if (status) {
      await updateLeadStatus(auth.tenantId, id, status);
    }

    // Obtener lead actual para comparar assignedTo
    const currentLead = await getLeadById(auth.tenantId, id);
    
    if (assignedTo !== undefined || notes !== undefined) {
      await updateLead(auth.tenantId, id, {
        assignedTo,
        notes,
      });

      // Crear notificación si se asignó a un nuevo usuario
      if (assignedTo && assignedTo !== currentLead?.assignedTo) {
        try {
          const { createNotification } = await import('@autodealers/core');
          await createNotification({
            tenantId: auth.tenantId,
            userId: assignedTo,
            type: 'lead_assigned',
            title: 'Lead asignado',
            message: `Se te ha asignado un nuevo lead: ${currentLead?.contact?.name || 'Sin nombre'}`,
            channels: ['system'],
            metadata: {
              leadId: id,
              route: `/leads/${id}`,
            },
          });
        } catch (notifError) {
          console.warn('No se pudo crear notificación:', notifError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






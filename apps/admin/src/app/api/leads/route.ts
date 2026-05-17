export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getLeads, createLead, type LeadSource, type LeadStatus } from '@autodealers/crm';
import { canPerformAction } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const source = searchParams.get('source');

    const leads = await getLeads(auth.tenantId, {
      status: (status as LeadStatus) || undefined,
      assignedTo: assignedTo || undefined,
      source: (source as LeadSource) || undefined,
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
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
    const { source, contact, notes } = body;

    if (!source || !contact || !contact.name || !contact.phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const quota = await canPerformAction(auth.tenantId, 'addLead');
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason || 'Límite de leads del plan alcanzado' },
        { status: 403 }
      );
    }

    const lead = await createLead(auth.tenantId, source, contact, notes);

    // Crear notificación para el usuario que creó el lead o el asignado
    try {
      const { createNotification } = await import('@autodealers/core');
      await createNotification({
        tenantId: auth.tenantId,
        userId: auth.userId || '',
        type: 'lead_created',
        title: 'Nuevo lead creado',
        message: `Se ha creado un nuevo lead: ${contact.name}`,
        channels: ['system'],
        metadata: {
          leadId: lead.id,
          route: `/leads/${lead.id}`,
        },
      });
    } catch (notifError) {
      console.warn('No se pudo crear notificación:', notifError);
      // No fallar si la notificación falla
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






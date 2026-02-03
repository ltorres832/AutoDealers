import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getLeads, createLead, LeadStatus, LeadSource } from '@autodealers/crm';
import { createNotification } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const search = searchParams.get('search');

    const leads = await getLeads(auth.tenantId, {
      status: status ? (status as LeadStatus) : undefined,
      source: source ? (source as LeadSource) : undefined,
    });

    // Filtrar por búsqueda
    let filteredLeads = leads;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLeads = leads.filter(
        (lead) =>
          lead.contact.name.toLowerCase().includes(searchLower) ||
          lead.contact.phone.includes(search) ||
          lead.contact.email?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      leads: filteredLeads.map((lead) => ({
        ...lead,
        createdAt: lead.createdAt.toISOString(),
      })),
    });
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

    const lead = await createLead(
      auth.tenantId,
      body.source,
      body.contact,
      body.notes
    );

    // Crear notificación
    try {
      await createNotification({
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: 'lead_created',
        title: 'Nuevo Lead Creado',
        message: `Se ha creado un nuevo lead: ${body.contact.name} (${body.contact.phone})`,
        channels: ['system'],
        metadata: { leadId: lead.id },
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // No fallar la creación del lead si falla la notificación
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




import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getLeads, createLead } from '@autodealers/crm';
import { createNotification } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const search = searchParams.get('search');

    // Solo obtener leads asignados al vendedor    
    const leads = await getLeads(auth.tenantId, {  
      status: status as any || undefined,
      source: source as any || undefined,
      assignedTo: auth.userId,
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
        updatedAt: lead.updatedAt.toISOString(),
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
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validar campos requeridos
    if (!body.contact || !body.contact.name || !body.contact.phone) {
      return NextResponse.json(
        { error: 'El nombre y teléfono del contacto son requeridos' },
        { status: 400 }
      );
    }

    // Crear el lead asignado automáticamente al seller
    const lead = await createLead(
      auth.tenantId,
      body.source || 'manual',
      body.contact,
      body.notes || ''
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

    return NextResponse.json({ 
      lead: {
        ...lead,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}



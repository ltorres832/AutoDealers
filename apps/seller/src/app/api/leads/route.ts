import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { resolveIndependentSellerWorkspace } from '@/lib/seller-workspace';
import { getLeads, createLead, normalizeLeadSource, sanitizeLeadTradeIn } from '@autodealers/crm';
import { getVehicleById, buildVehicleStockSnapshot } from '@autodealers/inventory';
import { createNotification, canPerformAction } from '@autodealers/core';

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

    const independentWorkspace = await resolveIndependentSellerWorkspace(auth);

    const leads = await getLeads(auth.tenantId, {
      status: status as any || undefined,
      source: source as any || undefined,
      assignedTo: independentWorkspace ? undefined : auth.userId,
    });

    // Filtrar por búsqueda
    let filteredLeads = leads;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLeads = leads.filter(
        (lead) =>
          (lead.contact?.name || '').toLowerCase().includes(searchLower) ||
          (lead.contact?.phone || '').includes(search) ||
          (lead.contact?.email || '').toLowerCase().includes(searchLower)
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

    const contact = {
      name: String(body.contact.name).trim(),
      phone: String(body.contact.phone).trim(),
      ...(body.contact.email != null && String(body.contact.email).trim()
        ? { email: String(body.contact.email).trim() }
        : {}),
      preferredChannel:
        typeof body.contact.preferredChannel === 'string' && body.contact.preferredChannel.trim()
          ? String(body.contact.preferredChannel).trim().slice(0, 40)
          : 'phone',
    };

    const quota = await canPerformAction(auth.tenantId, 'addLead');
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason || 'No puedes crear más leads' }, { status: 403 });
    }

    let vehicleStockSnapshot = body.vehicleStockSnapshot;
    let vehicleStockNumber = body.vehicleStockNumber;
    const vehicleId = typeof body.vehicleId === 'string' && body.vehicleId.trim() ? body.vehicleId.trim() : undefined;
    if (vehicleId && !vehicleStockSnapshot) {
      const v = await getVehicleById(auth.tenantId, vehicleId);
      if (v) {
        vehicleStockSnapshot = buildVehicleStockSnapshot(v);
        vehicleStockNumber = vehicleStockNumber || v.stockNumber || v.specifications?.stockNumber;
      }
    }

    const vehicleInterest =
      typeof body.vehicleInterest === 'string' && body.vehicleInterest.trim()
        ? body.vehicleInterest.trim().slice(0, 2000)
        : undefined;
    const budgetRaw = body.budget;
    const budget =
      budgetRaw !== undefined && budgetRaw !== null && String(budgetRaw).trim() !== ''
        ? typeof budgetRaw === 'number'
          ? budgetRaw
          : String(budgetRaw).trim().slice(0, 80)
        : undefined;

    const tradeIn = sanitizeLeadTradeIn(body.tradeIn);

    const lead = await createLead(
      auth.tenantId,
      normalizeLeadSource(body.source, 'manual'),
      contact,
      body.notes || '',
      {
        assignedTo: auth.userId,
        createdBy: auth.userId,
        sellerOwned: true,
        tags: ['vendedor_propio'],
        ...(vehicleId ? { vehicleId } : {}),
        ...(vehicleStockNumber ? { vehicleStockNumber: String(vehicleStockNumber) } : {}),
        ...(vehicleStockSnapshot ? { vehicleStockSnapshot } : {}),
        ...(vehicleInterest ? { vehicleInterest } : {}),
        ...(budget !== undefined ? { budget } : {}),
        ...(tradeIn ? { tradeIn } : {}),
      }
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



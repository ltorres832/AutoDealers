import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@autodealers/crm';
import { getAutomotiveBusinessById, isFeatureEnabled, recognizeGarageVehicle } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const appointmentsEnabled = await isFeatureEnabled('business', 'business_appointments_enabled');
    const crmEnabled = await isFeatureEnabled('business', 'business_crm_enabled');
    if (!appointmentsEnabled && !crmEnabled) {
      return NextResponse.json({ error: 'Las solicitudes no están habilitadas.' }, { status: 403 });
    }

    const body = await request.json();
    const tenantId = String(body.tenantId || '');
    const business = await getAutomotiveBusinessById(tenantId);
    if (!business || !business.published) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    if (!name || !phone) {
      return NextResponse.json({ error: 'Nombre y teléfono son requeridos' }, { status: 400 });
    }

    const vehicleLabel = [body.year, body.make, body.model].filter(Boolean).join(' ');
    const notes = [
      body.message ? String(body.message) : '',
      vehicleLabel ? `Vehículo: ${vehicleLabel}` : '',
      body.preferredDate ? `Fecha preferida: ${body.preferredDate}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const lead = await createLead(
      tenantId,
      'web',
      {
        name,
        phone,
        email: email || undefined,
        preferredChannel: email ? 'email' : 'phone',
      },
      notes || 'Solicitud de servicio desde el directorio público',
      {
        vehicleInterest: vehicleLabel || undefined,
      }
    );

    await recognizeGarageVehicle({
      email: email || undefined,
      phone,
      token: body.token ? String(body.token) : undefined,
      year: body.year ? Number(body.year) : undefined,
      make: body.make,
      model: body.model,
      source: 'appointment',
    });

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    console.error('Error creating service request:', error);
    return NextResponse.json({ error: error?.message || 'No se pudo enviar la solicitud' }, { status: 500 });
  }
}

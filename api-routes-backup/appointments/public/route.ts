import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - se cargan dinámicamente para evitar errores de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getTenantBySubdomain, createNotification } = require('@autodealers/core') as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createAppointment, createLead } = require('@autodealers/crm') as any;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subdomain, name, phone, email, type, preferredDate, preferredTime, vehicleId, notes } = body;

    if (!subdomain || !name || !phone || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Obtener tenant por subdominio
    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Crear lead si no existe
    const scheduledAt = new Date(`${preferredDate}T${preferredTime}`);

    // Crear o obtener lead
    const lead = await createLead({
      tenantId: tenant.id,
      source: 'web',
      contact: {
        name,
        phone,
        email,
      },
      notes: notes || `Solicitud de ${type}`,
      status: 'new',
    });

    // Obtener sellerId del body si existe
    const sellerId = body.sellerId || '';

    // Crear cita
    const appointment = await createAppointment({
      tenantId: tenant.id,
      leadId: lead.id,
      assignedTo: sellerId || '', // Asignar al vendedor seleccionado o dejar vacío para asignación automática
      vehicleIds: vehicleId ? [vehicleId] : [],
      type,
      scheduledAt,
      duration: type === 'test_drive' ? 60 : type === 'delivery' ? 45 : 30,
      status: 'pending',
    });

    // Enviar notificaciones
    await createNotification({
      tenantId: tenant.id,
      userId: '', // Se notificará a todos los vendedores
      type: 'appointment_requested',
      title: 'Nueva Solicitud de Cita',
      message: `${name} ha solicitado una ${type === 'test_drive' ? 'prueba de manejo' : 'cita'} para ${scheduledAt.toLocaleString()}`,
      channels: ['system', 'email'],
      metadata: {
        appointmentId: appointment.id,
        leadId: lead.id,
      },
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    console.error('Error creating public appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





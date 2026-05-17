import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createLead, createAppointment, addInteraction } from '@autodealers/crm';
import { getVehicleById, buildVehicleStockSnapshot } from '@autodealers/inventory';
import { canPerformAction } from '@autodealers/core';

export const dynamic = 'force-dynamic';

type ScheduleIntent = 'appointment' | 'test_drive_request';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quota = await canPerformAction(auth.tenantId, 'addLead');
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason || 'Límite de leads' }, { status: 403 });
    }

    const body = await request.json();
    const {
      intent: intentRaw,
      vehicleId,
      contact,
      scheduledAt: scheduledAtRaw,
      type,
      duration,
      notes: notesRaw,
      driverLicense: driverLicenseRaw,
    } = body;

    const intent: ScheduleIntent =
      intentRaw === 'test_drive_request' ? 'test_drive_request' : 'appointment';

    if (!vehicleId || !contact?.name || !contact?.phone) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (intent === 'appointment') {
      if (!scheduledAtRaw || !type) {
        return NextResponse.json(
          { error: 'Para una cita se requieren fecha/hora y tipo' },
          { status: 400 }
        );
      }
    }

    const scheduledAtStr =
      scheduledAtRaw != null && String(scheduledAtRaw).trim() !== ''
        ? String(scheduledAtRaw).trim()
        : '';

    if (intent === 'test_drive_request' && scheduledAtStr && Number.isNaN(new Date(scheduledAtStr).getTime())) {
      return NextResponse.json({ error: 'Fecha y hora no válidas' }, { status: 400 });
    }

    if (intent === 'appointment' && Number.isNaN(new Date(String(scheduledAtRaw)).getTime())) {
      return NextResponse.json({ error: 'Fecha y hora no válidas' }, { status: 400 });
    }

    const v = await getVehicleById(auth.tenantId, String(vehicleId));
    if (!v) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    const snapshot = buildVehicleStockSnapshot(v);
    const vehicleSummary = `${v.year} ${v.make} ${v.model}`;
    const stockLabel = snapshot.stockNumber || String(v.id);

    const driverLicense =
      driverLicenseRaw != null && String(driverLicenseRaw).trim()
        ? String(driverLicenseRaw).trim()
        : '';

    const userNotes = notesRaw != null && String(notesRaw).trim() ? String(notesRaw).trim() : '';

    const intentLabel =
      intent === 'test_drive_request'
        ? 'Solicitud de prueba de manejo (inventario vendedor)'
        : 'Cita desde inventario vendedor';

    const extraLines: string[] = [intentLabel];
    if (driverLicense) {
      extraLines.push(`Licencia de conducir indicada: ${driverLicense}`);
    }
    if (intent === 'test_drive_request' && scheduledAtStr) {
      extraLines.push(
        `Preferencia de fecha/hora: ${new Date(scheduledAtStr).toLocaleString('es-ES')}`
      );
    }

    const combinedNotes = [userNotes, extraLines.join('\n')].filter(Boolean).join('\n\n').trim();
    const defaultNotes = `${intentLabel} — stock ${stockLabel}`;
    const leadNotes = combinedNotes || defaultNotes;

    const apptType =
      intent === 'test_drive_request'
        ? ('test_drive' as const)
        : (String(type) as 'consultation' | 'test_drive' | 'delivery');

    const vehicleInterest =
      intent === 'test_drive_request'
        ? `Prueba de manejo — ${vehicleSummary} (#${stockLabel})`
        : `Cita (${apptType}) — ${vehicleSummary} (#${stockLabel})`;

    const lead = await createLead(
      auth.tenantId,
      'manual',
      {
        name: String(contact.name).trim(),
        phone: String(contact.phone).trim(),
        email: contact.email ? String(contact.email).trim() : undefined,
        preferredChannel: 'phone',
      },
      leadNotes,
      {
        assignedTo: auth.userId,
        vehicleId: String(vehicleId),
        vehicleStockNumber: snapshot.stockNumber,
        vehicleStockSnapshot: snapshot,
        createdBy: auth.userId,
        vehicleInterest,
      }
    );

    let appointment: Awaited<ReturnType<typeof createAppointment>> | null = null;

    const shouldBook =
      intent === 'appointment' ? true : Boolean(scheduledAtStr && intent === 'test_drive_request');

    if (shouldBook && scheduledAtStr) {
      appointment = await createAppointment({
        tenantId: auth.tenantId,
        leadId: lead.id,
        assignedTo: auth.userId,
        vehicleIds: [String(vehicleId)],
        type: apptType,
        scheduledAt: new Date(scheduledAtStr),
        duration: typeof duration === 'number' ? duration : 60,
        status: 'scheduled',
      });
    }

    try {
      const whenText = appointment
        ? new Date(appointment.scheduledAt).toLocaleString('es-ES')
        : 'sin fecha en calendario (solo lead)';
      await addInteraction(auth.tenantId, lead.id, {
        type: appointment ? 'appointment' : 'note',
        content: appointment
          ? `${intentLabel}. Cita (${apptType}) el ${whenText}. Vehículo: ${vehicleSummary} (#${stockLabel}).`
          : `${intentLabel}. Cliente: ${String(contact.name).trim()}. Vehículo: ${vehicleSummary} (#${stockLabel}). Coordinar prueba por mensaje o teléfono.`,
        userId: auth.userId,
      });
    } catch (e) {
      console.warn('addInteraction schedule-appointment seller skipped:', e);
    }

    return NextResponse.json({ lead, appointment }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    console.error('schedule-appointment seller', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

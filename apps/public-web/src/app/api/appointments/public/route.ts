import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getTenantBySubdomain, canPerformAction } from '@autodealers/core';
import {
  createLead,
  createAppointment,
  ensurePublicAppointmentTrackingDoc,
  addInteraction,
} from '@autodealers/crm';
import { getVehicleById, buildVehicleStockSnapshot } from '@autodealers/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PublicScheduleIntent = 'appointment' | 'test_drive_request';

/**
 * Solicitud pública: crea lead (inventario + token). Cita en calendario si aplica.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      subdomain,
      name,
      phone,
      email,
      type,
      preferredDate,
      preferredTime,
      vehicleId,
      sellerId,
      notes,
      intent: intentRaw,
      driverLicense: driverLicenseRaw,
    } = body;

    const intent: PublicScheduleIntent =
      intentRaw === 'test_drive_request' ? 'test_drive_request' : 'appointment';

    if (!subdomain || !name || !phone || !sellerId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (intent === 'appointment') {
      if (!preferredDate || !preferredTime || !type) {
        return NextResponse.json(
          { error: 'Para una cita se requieren fecha, hora y tipo' },
          { status: 400 }
        );
      }
    }

    const dateStr = preferredDate != null ? String(preferredDate).trim() : '';
    const timeStr = preferredTime != null ? String(preferredTime).trim() : '';
    if (intent === 'test_drive_request') {
      if ((dateStr && !timeStr) || (!dateStr && timeStr)) {
        return NextResponse.json(
          { error: 'Indica fecha y hora juntas, o deja ambas vacías para solo solicitud de prueba' },
          { status: 400 }
        );
      }
    }

    const tenant = await getTenantBySubdomain(String(subdomain));
    if (!tenant || (tenant as { status?: string }).status !== 'active') {
      return NextResponse.json({ error: 'Concesionario no encontrado' }, { status: 404 });
    }

    const tenantId = (tenant as { id: string }).id;

    const quota = await canPerformAction(tenantId, 'addLead');
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason || 'No se pueden crear más leads este mes con el plan actual.' },
        { status: 403 }
      );
    }

    let vehicleStockSnapshot: ReturnType<typeof buildVehicleStockSnapshot> | undefined;
    let vehicleStockNumber: string | undefined;
    let vehicleSummary = '';
    const vid = typeof vehicleId === 'string' && vehicleId.trim() ? vehicleId.trim() : undefined;
    if (vid) {
      const v = await getVehicleById(tenantId, vid);
      if (v) {
        vehicleStockSnapshot = buildVehicleStockSnapshot(v);
        vehicleStockNumber = v.stockNumber || v.specifications?.stockNumber;
        vehicleSummary = `${v.year} ${v.make} ${v.model}`;
      }
    }

    const trackingToken = randomBytes(24).toString('hex');

    const driverLicense =
      driverLicenseRaw != null && String(driverLicenseRaw).trim()
        ? String(driverLicenseRaw).trim()
        : '';

    const apptType =
      intent === 'test_drive_request'
        ? ('test_drive' as const)
        : (String(type) as 'consultation' | 'test_drive' | 'delivery');

    const stockLabel = vehicleStockNumber || vid || '—';
    const vehicleInterest =
      intent === 'test_drive_request'
        ? `Prueba de manejo (web) — ${vehicleSummary || 'vehículo'} (#${stockLabel})`
        : `Cita (${apptType}) (web) — ${vehicleSummary || 'vehículo'} (#${stockLabel})`;

    const intentLabel =
      intent === 'test_drive_request'
        ? 'Solicitud de prueba de manejo desde página pública'
        : `Solicitud de cita (${apptType}) desde página pública`;

    const extraLines = [intentLabel];
    if (driverLicense) {
      extraLines.push(`Licencia indicada: ${driverLicense}`);
    }
    if (intent === 'test_drive_request' && dateStr && timeStr) {
      extraLines.push(
        `Preferencia: ${new Date(`${dateStr}T${timeStr}:00`).toLocaleString('es-ES')}`
      );
    }

    const userNotes = notes != null && String(notes).trim() ? String(notes).trim() : '';
    const leadNotes = [userNotes, extraLines.join('\n')].filter(Boolean).join('\n\n').trim();

    const lead = await createLead(
      tenantId,
      'web',
      {
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : undefined,
        preferredChannel: 'phone',
      },
      leadNotes || intentLabel,
      {
        assignedTo: String(sellerId).trim(),
        vehicleId: vid,
        vehicleStockNumber,
        vehicleStockSnapshot,
        publicTrackingToken: trackingToken,
        vehicleInterest,
      }
    );

    let appointment: Awaited<ReturnType<typeof createAppointment>> | null = null;

    const bookSlot =
      intent === 'appointment' ? true : Boolean(intent === 'test_drive_request' && dateStr && timeStr);

    if (bookSlot && dateStr && timeStr) {
      const scheduledAt = new Date(`${dateStr}T${timeStr}:00`);
      if (Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ error: 'Fecha u hora no válidas' }, { status: 400 });
      }
      appointment = await createAppointment({
        tenantId,
        leadId: lead.id,
        assignedTo: String(sellerId).trim(),
        vehicleIds: vid ? [vid] : [],
        type: apptType,
        scheduledAt,
        duration: 60,
        status: 'scheduled',
      });
    }

    await ensurePublicAppointmentTrackingDoc(trackingToken, {
      tenantId,
      leadId: lead.id,
      subdomain: String(subdomain),
    });

    try {
      await addInteraction(tenantId, lead.id, {
        type: appointment ? 'appointment' : 'note',
        content: appointment
          ? `${intentLabel}. Cita (${apptType}) el ${new Date(appointment.scheduledAt).toLocaleString('es-ES')}.`
          : `${intentLabel}. Sin cita en calendario; el equipo contactará al cliente.`,
        userId: 'system',
      });
    } catch (e) {
      console.warn('addInteraction public appointment skipped:', e);
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      tenantId,
      appointmentId: appointment?.id ?? null,
      trackingToken,
      subdomain: String(subdomain),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al crear la cita';
    console.error('POST /api/appointments/public', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

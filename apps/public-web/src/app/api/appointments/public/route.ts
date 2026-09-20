import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getFirestore, getTenantBySubdomain, canPerformAction } from '@autodealers/core';
import {
  createLead,
  createAppointment,
  ensurePublicAppointmentTrackingDoc,
  addInteraction,
  linkSellToDealerAppointment,
} from '@autodealers/crm';
import { getVehicleById, buildVehicleStockSnapshot } from '@autodealers/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PublicScheduleIntent = 'appointment' | 'test_drive_request';

async function resolveActiveTenant(identifier: string): Promise<{ id: string; status?: string } | null> {
  const value = identifier.trim();
  if (!value) return null;

  const bySubdomain = await getTenantBySubdomain(value);
  if (bySubdomain && (bySubdomain as { status?: string }).status === 'active') {
    return bySubdomain as { id: string; status?: string };
  }

  const doc = await getFirestore().collection('tenants').doc(value).get();
  if (!doc.exists) return null;
  const data = doc.data() || {};
  if (data.status !== 'active') return null;
  return { id: doc.id, status: data.status };
}

async function resolveDefaultSellerId(tenantId: string): Promise<string> {
  const db = getFirestore();
  const tenantSnap = await db.collection('tenants').doc(tenantId).get();
  const tenantData = tenantSnap.data() || {};
  const sellerInfo = tenantData.sellerInfo as Record<string, unknown> | undefined;
  const sellerInfoId = typeof sellerInfo?.id === 'string' ? sellerInfo.id.trim() : '';
  if (sellerInfoId) return sellerInfoId;

  const tenantOwnerId = typeof tenantData.ownerId === 'string' ? tenantData.ownerId.trim() : '';
  if (tenantData.type === 'seller' && tenantOwnerId) return tenantOwnerId;

  const directSellerSnap = await db
    .collection('users')
    .where('tenantId', '==', tenantId)
    .where('role', '==', 'seller')
    .limit(1)
    .get();
  if (!directSellerSnap.empty) return directSellerSnap.docs[0].id;

  const dealerSellerSnap = await db
    .collection('users')
    .where('dealerId', '==', tenantId)
    .where('role', '==', 'seller')
    .limit(1)
    .get();
  if (!dealerSellerSnap.empty) return dealerSellerSnap.docs[0].id;

  return tenantOwnerId;
}

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
      sellToDealerToken: sellToDealerTokenRaw,
    } = body;

    const intent: PublicScheduleIntent =
      intentRaw === 'test_drive_request' ? 'test_drive_request' : 'appointment';

    if (!subdomain || !name || !phone) {
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

    const tenant = await resolveActiveTenant(String(subdomain));
    if (!tenant) {
      return NextResponse.json({ error: 'Concesionario no encontrado' }, { status: 404 });
    }

    const tenantId = tenant.id;
    const cleanSellerId = String(sellerId || '').trim() || (await resolveDefaultSellerId(tenantId));
    if (!cleanSellerId) {
      return NextResponse.json(
        { error: 'No hay asesor disponible para recibir esta solicitud.' },
        { status: 400 }
      );
    }

    const sellerDoc = await getFirestore().collection('users').doc(cleanSellerId).get();
    const sellerData = sellerDoc.data() || {};
    const sellerBelongsToTenant =
      sellerDoc.exists &&
      (sellerData.tenantId === tenantId ||
        sellerData.dealerId === tenantId ||
        (Array.isArray(sellerData.associatedDealers) && sellerData.associatedDealers.includes(tenantId)));
    if (!sellerBelongsToTenant) {
      return NextResponse.json({ error: 'Vendedor no disponible para este concesionario' }, { status: 400 });
    }

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

    const tags = ['vendedor_propio', 'cita_publica'];
    const sellToDealerToken =
      sellToDealerTokenRaw != null && String(sellToDealerTokenRaw).trim()
        ? String(sellToDealerTokenRaw).trim()
        : '';
    if (sellToDealerToken) {
      tags.push('sell_to_dealer_closing');
    }

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
        assignedTo: cleanSellerId,
        createdBy: cleanSellerId,
        sellerOwned: true,
        vehicleId: vid,
        vehicleStockNumber,
        vehicleStockSnapshot,
        publicTrackingToken: trackingToken,
        vehicleInterest,
        tags,
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
      try {
        appointment = await createAppointment({
          tenantId,
          leadId: lead.id,
          assignedTo: cleanSellerId,
          vehicleIds: vid ? [vid] : [],
          type: apptType,
          scheduledAt,
          duration: 60,
          status: 'scheduled',
        });
      } catch (appointmentError) {
        if (intent === 'appointment') {
          throw appointmentError;
        }
        console.warn('public test drive appointment creation skipped:', appointmentError);
      }
    }

    void ensurePublicAppointmentTrackingDoc(trackingToken, {
      tenantId,
      leadId: lead.id,
      subdomain: String(subdomain),
    }).catch((e) => console.warn('public appointment tracking skipped:', e));

    void addInteraction(tenantId, lead.id, {
        type: appointment ? 'appointment' : 'note',
        content: appointment
          ? `${intentLabel}. Cita (${apptType}) el ${new Date(appointment.scheduledAt).toLocaleString('es-ES')}.`
          : `${intentLabel}. Sin cita en calendario; el equipo contactará al cliente.`,
        userId: 'system',
      }).catch((e) => console.warn('addInteraction public appointment skipped:', e));

    if (sellToDealerToken && appointment?.id) {
      void linkSellToDealerAppointment(sellToDealerToken, appointment.id).catch((e) =>
        console.warn('linkSellToDealerAppointment skipped:', e)
      );
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

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'node:crypto';
import {
  getFirestore,
  getTenantById,
  getTenantBySubdomain,
  canPerformAction,
} from '@autodealers/core';
import { getVehicleById, buildVehicleStockSnapshot } from '@autodealers/inventory';
import { createLead, normalizeLeadSource } from '@autodealers/crm';
import * as admin from 'firebase-admin';
import { isVehicleVisibleOnPublicListing } from '@/lib/public-catalog-visibility';

export const dynamic = 'force-dynamic';

async function resolvePublicCatalogTenantId(raw: string): Promise<string | null> {
  const t = raw.trim();
  if (!t) return null;
  const byId = await getTenantById(t);
  if (byId && String((byId as { status?: string }).status || 'active') === 'active') {
    return byId.id;
  }
  const bySub = await getTenantBySubdomain(t);
  return bySub?.id ?? null;
}

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip');
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

async function saveVehicleInterestSignal(
  db: ReturnType<typeof getFirestore>,
  tenantId: string,
  vehicleId: string,
  payload: {
    surface: string;
    path: string | null;
    referrer: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    userAgent: string | null;
    ipHash: string | null;
    hasExplicitContact?: boolean;
  }
): Promise<void> {
  try {
    await db.collection('tenants').doc(tenantId).collection('vehicle_interest_signals').add({
      vehicleId,
      surface: payload.surface.slice(0, 64),
      path: payload.path,
      referrer: payload.referrer,
      utmSource: payload.utmSource,
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      userAgent: payload.userAgent,
      ipHash: payload.ipHash,
      ...(payload.hasExplicitContact ? { hasExplicitContact: true } : { anonymous: true }),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn('[vehicle_interest_signals]', e);
  }
}

type ViewBody = {
  tenantId?: string;
  contact?: { name?: string; phone?: string; email?: string; message?: string };
  source?: string;
  surface?: string;
  path?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

function signalFromRequest(request: NextRequest, url: URL, body: ViewBody) {
  const headerRef = request.headers.get('referer');
  const surface =
    (typeof body.surface === 'string' && body.surface.trim()) ||
    url.searchParams.get('surface') ||
    'unknown';
  const path =
    typeof body.path === 'string' && body.path.trim() ? body.path.trim().slice(0, 400) : null;
  const refBody = typeof body.referrer === 'string' && body.referrer.trim() ? body.referrer.trim().slice(0, 500) : '';
  const referrer = refBody || (headerRef ? headerRef.slice(0, 500) : null);
  const utmSource =
    typeof body.utmSource === 'string' && body.utmSource.trim() ? body.utmSource.trim().slice(0, 120) : null;
  const utmMedium =
    typeof body.utmMedium === 'string' && body.utmMedium.trim() ? body.utmMedium.trim().slice(0, 120) : null;
  const utmCampaign =
    typeof body.utmCampaign === 'string' && body.utmCampaign.trim() ? body.utmCampaign.trim().slice(0, 120) : null;
  const ua = (request.headers.get('user-agent') || '').slice(0, 240);
  return {
    surface: surface.slice(0, 64),
    path,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
    userAgent: ua || null,
    ipHash: hashIp(getClientIp(request)),
  };
}

/**
 * POST sin contacto: incrementa vistas del vehículo y guarda señal anónima (`vehicle_interest_signals`).
 * POST con `contact.name` + `contact.phone`: crea lead CRM + señal con `hasExplicitContact` (sin PII en la señal).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const db = getFirestore();
    const url = new URL(request.url);
    let tenantRaw = url.searchParams.get('tenantId');

    let body: ViewBody = {};
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        body = (await request.json()) as ViewBody;
      }
    } catch {
      body = {};
    }
    if (!tenantRaw && typeof body.tenantId === 'string') {
      tenantRaw = body.tenantId;
    }

    if (!tenantRaw?.trim()) {
      return NextResponse.json({ error: 'tenantId es requerido (query o JSON)' }, { status: 400 });
    }

    const resolvedTenantId = await resolvePublicCatalogTenantId(tenantRaw);
    if (!resolvedTenantId) {
      return NextResponse.json({ error: 'Concesionario no encontrado' }, { status: 404 });
    }

    const vehicle = await getVehicleById(resolvedTenantId, vehicleId);
    if (!vehicle || !isVehicleVisibleOnPublicListing(vehicle as Record<string, unknown>)) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    const sigBase = signalFromRequest(request, url, body);

    const c = body.contact;
    const name = typeof c?.name === 'string' ? c.name.trim() : '';
    const phone = typeof c?.phone === 'string' ? c.phone.trim() : '';
    const email = typeof c?.email === 'string' && c.email.trim() ? c.email.trim() : undefined;
    const message = typeof c?.message === 'string' && c.message.trim() ? c.message.trim() : undefined;

    if (name && phone) {
      const quota = await canPerformAction(resolvedTenantId, 'addLead');
      if (!quota.allowed) {
        return NextResponse.json(
          {
            success: false,
            leadCreated: false,
            error: quota.reason || 'No se pueden crear más leads con el plan actual.',
          },
          { status: 403 }
        );
      }

      const vehicleLabel = `${vehicle.year ?? ''} ${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim();
      const notes = [
        '[Catálogo web — ficha de vehículo]',
        `Vehículo: ${vehicleLabel || vehicleId} (ID: ${vehicleId})`,
        message ? `Mensaje del interesado: ${message}` : null,
        'Prospecto dejó datos desde la publicación; seguimiento a criterio del vendedor.',
      ]
        .filter(Boolean)
        .join('\n');

      const sellerId =
        (vehicle as { sellerId?: string }).sellerId || (vehicle as { assignedTo?: string }).assignedTo;

      const lead = await createLead(
        resolvedTenantId,
        normalizeLeadSource(body.source, 'web'),
        {
          name,
          phone,
          email,
          preferredChannel: email ? 'email' : 'phone',
        },
        notes,
        {
          vehicleId,
          vehicleStockSnapshot: buildVehicleStockSnapshot(vehicle),
          ...(sellerId ? { assignedTo: sellerId } : {}),
          tags: ['catalogo_web', 'ficha_vehiculo', 'interes_explicito'],
          initialStatus: 'new',
        }
      );

      await saveVehicleInterestSignal(db, resolvedTenantId, vehicleId, {
        ...sigBase,
        surface: 'contact_form',
        hasExplicitContact: true,
      });

      return NextResponse.json({
        success: true,
        leadCreated: true,
        leadId: lead.id,
        viewIncremented: false,
        signalRecorded: true,
      });
    }

    const vehicleRef = db.collection('tenants').doc(resolvedTenantId).collection('vehicles').doc(vehicleId);

    await vehicleRef.update({
      views: admin.firestore.FieldValue.increment(1),
      lastViewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await saveVehicleInterestSignal(db, resolvedTenantId, vehicleId, {
      ...sigBase,
      surface: sigBase.surface === 'unknown' ? 'catalog_anonymous' : sigBase.surface,
    });

    return NextResponse.json({
      success: true,
      leadCreated: false,
      viewIncremented: true,
      signalRecorded: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('POST /api/public/vehicles/[id]/view', error);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}

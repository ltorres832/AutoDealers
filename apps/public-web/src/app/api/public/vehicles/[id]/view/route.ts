import { NextRequest, NextResponse } from 'next/server';
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

/**
 * POST sin cuerpo (o sin contacto): incrementa `views` del vehículo.
 * POST con `contact.name` + `contact.phone`: crea lead CRM (sin volver a incrementar vistas).
 * `tenantId` en query o en JSON puede ser ID Firestore o subdominio del tenant.
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

    let body: {
      tenantId?: string;
      contact?: { name?: string; phone?: string; email?: string; message?: string };
      source?: string;
    } = {};
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        body = (await request.json()) as typeof body;
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
          /** “Lead frío”: visible en CRM (filtro Perdido); el vendedor puede reabrir a `new`. */
          initialStatus: 'lost',
        }
      );

      return NextResponse.json({
        success: true,
        leadCreated: true,
        leadId: lead.id,
        viewIncremented: false,
      });
    }

    const vehicleRef = db.collection('tenants').doc(resolvedTenantId).collection('vehicles').doc(vehicleId);

    await vehicleRef.update({
      views: admin.firestore.FieldValue.increment(1),
      lastViewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, leadCreated: false, viewIncremented: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('POST /api/public/vehicles/[id]/view', error);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}

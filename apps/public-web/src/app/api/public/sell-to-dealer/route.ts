import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, getTenantBySubdomain } from '@autodealers/core';
import {
  createSellToDealerRequest,
  validateSellToDealerInput,
  addSellToDealerMessage,
} from '@autodealers/crm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveActiveTenant(identifier: string): Promise<{ id: string; subdomain?: string } | null> {
  const value = identifier.trim();
  if (!value) return null;

  const bySubdomain = await getTenantBySubdomain(value);
  if (bySubdomain && (bySubdomain as { status?: string }).status === 'active') {
    return {
      id: (bySubdomain as { id: string }).id,
      subdomain: value,
    };
  }

  const doc = await getFirestore().collection('tenants').doc(value).get();
  if (!doc.exists) return null;
  const data = doc.data() || {};
  if (data.status !== 'active') return null;
  return {
    id: doc.id,
    subdomain: typeof data.subdomain === 'string' ? data.subdomain : undefined,
  };
}

/** POST — cliente envía su auto para venderlo al dealer (NO trade-in). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subdomainOrId = String(body.subdomain || body.tenantId || '').trim();
    if (!subdomainOrId) {
      return NextResponse.json({ error: 'Dealer requerido' }, { status: 400 });
    }

    const tenant = await resolveActiveTenant(subdomainOrId);
    if (!tenant) {
      return NextResponse.json({ error: 'Concesionario no encontrado' }, { status: 404 });
    }

    let subdomain =
      tenant.subdomain || (body.subdomain ? String(body.subdomain).trim() : '') || undefined;
    if (!subdomain) {
      const tSnap = await getFirestore().collection('tenants').doc(tenant.id).get();
      const tData = tSnap.data() || {};
      if (typeof tData.subdomain === 'string' && tData.subdomain.trim()) {
        subdomain = tData.subdomain.trim();
      }
    }

    const contact = {
      name: String(body.name || body.contact?.name || ''),
      phone: String(body.phone || body.contact?.phone || ''),
      email: String(body.email || body.contact?.email || ''),
    };
    const vehicle = {
      make: String(body.make || body.vehicle?.make || ''),
      model: String(body.model || body.vehicle?.model || ''),
      year: Number(body.year ?? body.vehicle?.year),
      mileage: Number(body.mileage ?? body.vehicle?.mileage),
      color: String(body.color || body.vehicle?.color || ''),
      vin: String(body.vin || body.vehicle?.vin || '') || undefined,
      condition: String(body.condition || body.vehicle?.condition || '') || undefined,
      notes: String(body.notes || body.vehicle?.notes || '') || undefined,
      photos: Array.isArray(body.photos || body.vehicle?.photos)
        ? (body.photos || body.vehicle.photos)
        : [],
    };

    const validationError = validateSellToDealerInput({ contact, vehicle });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const created = await createSellToDealerRequest({
      tenantId: tenant.id,
      subdomain,
      contact,
      vehicle,
    });

    await addSellToDealerMessage(tenant.id, created.id, {
      fromClient: true,
      content: `Solicitud enviada: ${vehicle.year} ${vehicle.make} ${vehicle.model}, ${vehicle.mileage} mi, color ${vehicle.color}.`,
    });

    const pathSub = created.subdomain || subdomain || tenant.id;
    return NextResponse.json({
      ok: true,
      requestId: created.id,
      tenantId: tenant.id,
      publicToken: created.publicToken,
      subdomain: pathSub,
      trackingPath: `/${pathSub}/vender/seguimiento?token=${created.publicToken}`,
    });
  } catch (error: unknown) {
    console.error('POST sell-to-dealer:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

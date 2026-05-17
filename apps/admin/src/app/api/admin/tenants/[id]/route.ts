import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantById, updateTenant } from '@autodealers/core';
import { getUsersByTenant } from '@autodealers/core';
import { getVehicles } from '@autodealers/inventory';
import { getLeads } from '@autodealers/crm';
import { getTenantSales } from '@autodealers/crm';
import { getFirestore } from '@autodealers/shared';

const db = getFirestore();

const RELATION_KEYS = new Set(['users', 'vehicles', 'leads', 'sales']);

function sanitizeTenantPatch(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (RELATION_KEYS.has(k) || k === 'id') continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      console.error('Unauthorized access attempt to tenant:', id);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id || id === 'undefined' || id === 'null') {
      console.error('Invalid tenant ID:', id);
      return NextResponse.json({ error: 'Invalid tenant ID' }, { status: 400 });
    }

    const tenant = await getTenantById(id);
    if (!tenant) {
      console.warn('Tenant not found:', id);
      return NextResponse.json({ error: 'Tenant not found', tenantId: id }, { status: 404 });
    }

    const tenantDoc = await db.collection('tenants').doc(id).get();
    const tenantData = tenantDoc.data() || {};

    const [users, vehicles, leads, sales] = await Promise.all([
      getUsersByTenant(id),
      getVehicles(id),
      getLeads(id),
      getTenantSales(id),
    ]);

    // Fusión: todo lo guardado en Firestore + objeto normalizado (fechas) para que el admin vea/edite campos completos
    const merged = {
      ...tenantData,
      ...tenant,
      id: tenant.id,
      description: (tenantData as { description?: string }).description ?? '',
      ownerId: (tenantData as { ownerId?: string }).ownerId,
      phone: (tenantData as { phone?: string }).phone,
      users,
      vehicles,
      leads,
      sales,
    };

    return NextResponse.json({ tenant: merged });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { id } = await params;
    const patch = sanitizeTenantPatch(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    const ref = db.collection('tenants').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    const cur = snap.data() || {};

    if (patch.branding && typeof patch.branding === 'object') {
      patch.branding = { ...(cur.branding || {}), ...(patch.branding as object) };
    }
    if (patch.settings && typeof patch.settings === 'object') {
      patch.settings = { ...(cur.settings || {}), ...(patch.settings as object) };
    }

    await updateTenant(id, patch as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Elimina el documento del tenant y los vehículos en su subcolección.
 * Otras subcolecciones (p. ej. leads) pueden quedar huérfanas; limpiarlas en otro proceso si aplica.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Invalid tenant ID' }, { status: 400 });
    }

    const tenantRef = db.collection('tenants').doc(id);
    const snap = await tenantRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const vehiclesCol = tenantRef.collection('vehicles');
    // Borrar vehículos en lotes (límite ~500 por batch en Firestore)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = db.batch();
      const page = await vehiclesCol.limit(400).get();
      if (page.empty) break;
      page.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    await tenantRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

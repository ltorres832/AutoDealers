import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { getFIClientById, updateFIClient } from '@autodealers/crm';
import { getFirestore, isValidSsn, normalizeSsn } from '@autodealers/core';

async function resolveTenantId(user: { userId: string; tenantId?: string }) {
  if (user.tenantId) return user.tenantId;
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(user.userId).get();
  return userDoc.data()?.tenantId as string | undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user?.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (user.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores pueden acceder' }, { status: 403 });
    }

    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: 'No se pudo determinar el tenantId' }, { status: 400 });
    }

    const fiGate = await requireTenantFeature(tenantId, 'useFIModule');
    if (fiGate) return fiGate;

    const { id } = await params;
    const client = await getFIClientById(tenantId, id);
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener cliente';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user?.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (user.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores pueden editar clientes F&I' }, { status: 403 });
    }

    const tenantId = await resolveTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: 'No se pudo determinar el tenantId' }, { status: 400 });
    }

    const fiGate = await requireTenantFeature(tenantId, 'useFIModule');
    if (fiGate) return fiGate;

    const { id } = await params;
    const existing = await getFIClientById(tenantId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const updates = { ...body } as Record<string, unknown>;

    if (updates.ssn !== undefined) {
      if (updates.ssn && !isValidSsn(String(updates.ssn))) {
        return NextResponse.json(
          { error: 'SSN inválido. Use el formato XXX-XX-XXXX (9 dígitos).' },
          { status: 400 }
        );
      }
      updates.ssn = updates.ssn ? normalizeSsn(String(updates.ssn)) : undefined;
    }

    delete updates.id;
    delete updates.tenantId;
    delete updates.createdBy;
    delete updates.createdAt;

    await updateFIClient(tenantId, id, updates as Partial<typeof existing>);

    const client = await getFIClientById(tenantId, id);
    return NextResponse.json({ client });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al actualizar cliente';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

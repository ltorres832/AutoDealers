import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { deleteBusinessService, listBusinessServices, upsertBusinessService } from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const services = await listBusinessServices(auth.tenantId);
  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'El nombre del servicio es requerido' }, { status: 400 });
  const service = await upsertBusinessService(auth.tenantId, {
    id: body.id,
    name,
    description: body.description,
    priceCents: body.priceCents == null || body.priceCents === '' ? null : Math.round(Number(body.priceCents)),
    durationMinutes: body.durationMinutes == null || body.durationMinutes === '' ? null : Number(body.durationMinutes),
    isActive: body.isActive !== false,
    photoUrls: Array.isArray(body.photoUrls) ? body.photoUrls : undefined,
    videoUrls: Array.isArray(body.videoUrls) ? body.videoUrls : undefined,
    specialtySlugs: Array.isArray(body.specialtySlugs) ? body.specialtySlugs : [],
    vehicleScopeSlugs: Array.isArray(body.vehicleScopeSlugs) ? body.vehicleScopeSlugs : [],
  });
  return NextResponse.json({ service });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Falta el servicio' }, { status: 400 });
  await deleteBusinessService(auth.tenantId, id);
  return NextResponse.json({ ok: true });
}

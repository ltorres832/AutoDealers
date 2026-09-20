import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  deleteSpecializationItem,
  ensureDefaultSpecializations,
  listBusinessCategories,
  reorderSpecializationItems,
  upsertSpecializationItem,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (request.nextUrl.searchParams.get('seed') === '1') {
    const seeded = await ensureDefaultSpecializations();
    const categories = await listBusinessCategories(false);
    return NextResponse.json({ seeded, categories });
  }
  const categories = await listBusinessCategories(false);
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  if (body.seed === true) {
    const seeded = await ensureDefaultSpecializations();
    const categories = await listBusinessCategories(false);
    return NextResponse.json({ seeded, categories });
  }
  if (body.action === 'delete') {
    await deleteSpecializationItem({
      categoryId: String(body.categoryId || ''),
      kind: body.kind === 'vehicleScopes' ? 'vehicleScopes' : 'specialties',
      slug: String(body.slug || ''),
    });
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'reorder') {
    const items = await reorderSpecializationItems({
      categoryId: String(body.categoryId || ''),
      kind: body.kind === 'vehicleScopes' ? 'vehicleScopes' : 'specialties',
      slugs: Array.isArray(body.slugs) ? body.slugs.map(String) : [],
    });
    return NextResponse.json({ items });
  }
  const item = await upsertSpecializationItem({
    categoryId: String(body.categoryId || ''),
    kind: body.kind === 'vehicleScopes' ? 'vehicleScopes' : 'specialties',
    slug: body.slug ? String(body.slug) : undefined,
    label: String(body.label || ''),
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
  });
  return NextResponse.json({ item });
}

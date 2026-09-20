import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  listAutomotiveBusinessesAdmin,
  updateAutomotiveBusiness,
  ensureDefaultBusinessCategories,
  ensureDefaultBusinessMemberships,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const businesses = await listAutomotiveBusinessesAdmin(true);
  return NextResponse.json({ businesses });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  if (body.seed === true) {
    const [categories, memberships] = await Promise.all([
      ensureDefaultBusinessCategories(),
      ensureDefaultBusinessMemberships(),
    ]);
    return NextResponse.json({ seeded: true, categories, memberships });
  }
  if (!body.tenantId) {
    return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
  }
  await updateAutomotiveBusiness(String(body.tenantId), body);
  return NextResponse.json({ success: true });
}

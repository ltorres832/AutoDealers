import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { listBusinessCategories, upsertBusinessCategory, ensureDefaultBusinessCategories } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const created = await ensureDefaultBusinessCategories();
    const categories = await listBusinessCategories(false);
    return NextResponse.json({ created, categories });
  }
  const category = await upsertBusinessCategory(body);
  return NextResponse.json({ category });
}

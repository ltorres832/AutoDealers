import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { updateAutomotiveBusiness, getAutomotiveBusinessById } from '@autodealers/core';

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    await updateAutomotiveBusiness(auth.tenantId, body);
    const business = await getAutomotiveBusinessById(auth.tenantId);
    return NextResponse.json({ business });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudo guardar' }, { status: 400 });
  }
}

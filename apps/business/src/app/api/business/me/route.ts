import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { getAutomotiveBusinessById, getUserById } from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const [user, business] = await Promise.all([
    getUserById(auth.userId),
    getAutomotiveBusinessById(auth.tenantId),
  ]);
  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
  }
  return NextResponse.json({
    user: {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      mustChangePassword: user?.mustChangePassword === true,
    },
    business,
  });
}

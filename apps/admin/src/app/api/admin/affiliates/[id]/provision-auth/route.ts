export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { provisionAffiliatePortalAccess, getAffiliatePartner } from '@autodealers/core';
import { buildPublicWebUrl } from '@autodealers/shared/platform-urls';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const affiliate = await getAffiliatePartner(id);
    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado no encontrado' }, { status: 404 });
    }

    const result = await provisionAffiliatePortalAccess(
      id,
      typeof body.password === 'string' ? body.password : undefined
    );

    return NextResponse.json({
      success: true,
      authUserId: result.authUserId,
      temporaryPassword: result.temporaryPassword,
      portalUrl: buildPublicWebUrl('/affiliate/login'),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

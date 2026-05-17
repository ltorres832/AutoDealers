import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { linkCustomerFileToFiRequest } from '@autodealers/crm';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!isDealerPortalRole(user.role)) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const fiGate = await requireTenantFeature(user.tenantId, 'useFIModule');
    if (fiGate) return fiGate;

    const body = await request.json();
    const customerFileId = typeof body.customerFileId === 'string' ? body.customerFileId.trim() : '';
    const fiRequestId = typeof body.fiRequestId === 'string' ? body.fiRequestId.trim() : '';
    if (!customerFileId || !fiRequestId) {
      return NextResponse.json(
        { error: 'Se requiere customerFileId y fiRequestId' },
        { status: 400 }
      );
    }

    await linkCustomerFileToFiRequest(user.tenantId, customerFileId, fiRequestId);

    return NextResponse.json({ ok: true, customerFileId, fiRequestId });
  } catch (error: any) {
    console.error('POST /api/fi/link-customer-file:', error);
    return NextResponse.json(
      { error: error.message || 'Error al vincular expediente' },
      { status: 500 }
    );
  }
}

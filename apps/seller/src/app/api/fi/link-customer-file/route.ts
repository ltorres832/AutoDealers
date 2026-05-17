import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { getFirestore } from '@autodealers/core';
import { linkCustomerFileToFiRequest } from '@autodealers/crm';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (user.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores' }, { status: 403 });
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

    const db = getFirestore();
    const reqSnap = await db
      .collection('tenants')
      .doc(user.tenantId)
      .collection('fi_requests')
      .doc(fiRequestId)
      .get();
    if (!reqSnap.exists) {
      return NextResponse.json({ error: 'Solicitud F&I no encontrada' }, { status: 404 });
    }
    const createdBy = reqSnap.data()?.createdBy;
    if (createdBy && createdBy !== user.userId) {
      return NextResponse.json({ error: 'No tienes permiso para vincular esta solicitud' }, { status: 403 });
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

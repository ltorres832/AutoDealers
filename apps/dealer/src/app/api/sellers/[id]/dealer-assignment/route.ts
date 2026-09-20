import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore, removeSellerFromDealer, transferSellerToDealer } from '@autodealers/core';

function allowedTenantIds(auth: Awaited<ReturnType<typeof verifyAuth>>) {
  if (!auth?.tenantId) return [];
  return Array.from(new Set([auth.primaryTenantId, auth.tenantId, ...(auth.associatedDealers || [])].filter(Boolean)));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const toDealerTenantId = String(body.toDealerTenantId || '').trim();
    if (!id || !toDealerTenantId) {
      return NextResponse.json({ error: 'Vendedor y dealer destino requeridos.' }, { status: 400 });
    }
    if (!allowedTenantIds(auth).includes(toDealerTenantId)) {
      return NextResponse.json({ error: 'No tienes acceso a ese dealer.' }, { status: 403 });
    }

    const db = getFirestore();
    const sellerSnap = await db.collection('users').doc(id).get();
    const currentDealerId = String(sellerSnap.data()?.dealerId || auth.tenantId).trim();
    if (currentDealerId && !allowedTenantIds(auth).includes(currentDealerId)) {
      return NextResponse.json({ error: 'No tienes acceso al dealer actual del vendedor.' }, { status: 403 });
    }

    const link = await transferSellerToDealer({
      sellerUserId: id,
      fromDealerTenantId: currentDealerId || undefined,
      toDealerTenantId,
      toDealerUserId: auth.userId,
      transferredByUserId: auth.userId,
      inheritDealerMembership: false,
    });

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error('dealer seller assignment PATCH:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const dealerTenantId = String(body.dealerTenantId || auth.tenantId).trim();
    if (!id) return NextResponse.json({ error: 'Vendedor requerido.' }, { status: 400 });
    if (!allowedTenantIds(auth).includes(dealerTenantId)) {
      return NextResponse.json({ error: 'No tienes acceso a ese dealer.' }, { status: 403 });
    }

    await removeSellerFromDealer({
      sellerUserId: id,
      dealerTenantId,
      removedByUserId: auth.userId,
      cancelSellerAccount: body.cancelSellerAccount === true,
      preserveSellerMembership: body.cancelSellerAccount !== true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('dealer seller assignment DELETE:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

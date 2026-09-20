export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  assignSellerToDealerDirect,
  getFirestore,
  removeSellerFromDealer,
  transferSellerToDealer,
} from '@autodealers/core';

async function resolveDealerOwnerUserId(dealerTenantId: string): Promise<string> {
  const db = getFirestore();
  const tenantSnap = await db.collection('tenants').doc(dealerTenantId).get();
  const ownerId = String(tenantSnap.data()?.ownerId || '').trim();
  if (ownerId) return ownerId;
  const usersSnap = await db
    .collection('users')
    .where('tenantId', '==', dealerTenantId)
    .where('role', 'in', ['dealer', 'master_dealer', 'dealer_admin'])
    .limit(1)
    .get();
  return usersSnap.empty ? '' : usersSnap.docs[0].id;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const sellerUserId = String(body.sellerUserId || '').trim();
    const dealerTenantId = String(body.dealerTenantId || '').trim();
    if (!sellerUserId || !dealerTenantId) {
      return NextResponse.json(
        { error: 'sellerUserId y dealerTenantId son requeridos.' },
        { status: 400 }
      );
    }
    const dealerOwnerUserId = await resolveDealerOwnerUserId(dealerTenantId);
    if (!dealerOwnerUserId) {
      return NextResponse.json({ error: 'El dealer no tiene dueño/admin asociado.' }, { status: 400 });
    }

    const link = await assignSellerToDealerDirect({
      dealerTenantId,
      dealerUserId: dealerOwnerUserId,
      sellerUserId,
      assignedByUserId: auth.userId,
      source: 'admin_direct',
      inheritDealerMembership: body.inheritDealerMembership === true,
    });

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error('seller-dealer assignment POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const sellerUserId = String(body.sellerUserId || '').trim();
    const toDealerTenantId = String(body.toDealerTenantId || '').trim();
    const fromDealerTenantId = String(body.fromDealerTenantId || '').trim();
    if (!sellerUserId || !toDealerTenantId) {
      return NextResponse.json(
        { error: 'sellerUserId y toDealerTenantId son requeridos.' },
        { status: 400 }
      );
    }
    const dealerOwnerUserId = await resolveDealerOwnerUserId(toDealerTenantId);
    if (!dealerOwnerUserId) {
      return NextResponse.json({ error: 'El dealer destino no tiene dueño/admin asociado.' }, { status: 400 });
    }

    const link = await transferSellerToDealer({
      sellerUserId,
      fromDealerTenantId: fromDealerTenantId || undefined,
      toDealerTenantId,
      toDealerUserId: dealerOwnerUserId,
      transferredByUserId: auth.userId,
      inheritDealerMembership: body.inheritDealerMembership === true,
    });

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error('seller-dealer assignment PATCH:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const sellerUserId = String(body.sellerUserId || '').trim();
    const dealerTenantId = String(body.dealerTenantId || '').trim();
    if (!sellerUserId) {
      return NextResponse.json({ error: 'sellerUserId requerido.' }, { status: 400 });
    }

    await removeSellerFromDealer({
      sellerUserId,
      dealerTenantId: dealerTenantId || undefined,
      removedByUserId: auth.userId,
      cancelSellerAccount: body.cancelSellerAccount === true,
      preserveSellerMembership: body.cancelSellerAccount !== true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('seller-dealer assignment DELETE:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

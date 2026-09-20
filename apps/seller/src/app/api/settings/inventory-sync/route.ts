export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { isDealerManagedSellerAuth } from '@/lib/seller-vehicles';

/**
 * Sincronización del inventario del dealer en la cuenta del vendedor.
 * Solo disponible para vendedores dealer-managed (cuenta dada por el dealer).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eligible = Boolean(auth.dealerId) && isDealerManagedSellerAuth(auth);
    if (!eligible) {
      return NextResponse.json({ eligible: false, syncDealerInventory: false });
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(auth.userId).get();
    return NextResponse.json({
      eligible: true,
      syncDealerInventory: userDoc.data()?.syncDealerInventory === true,
      dealerTenantId: auth.dealerId,
    });
  } catch (error) {
    console.error('inventory-sync GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.dealerId || !isDealerManagedSellerAuth(auth)) {
      return NextResponse.json(
        { error: 'Solo los vendedores con cuenta de dealer pueden sincronizar el inventario del dealer' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const enabled = body.syncDealerInventory === true;

    const db = getFirestore();
    await db.collection('users').doc(auth.userId).update({
      syncDealerInventory: enabled,
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    });

    return NextResponse.json({ success: true, syncDealerInventory: enabled });
  } catch (error) {
    console.error('inventory-sync POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

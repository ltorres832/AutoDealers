import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import type { VehicleListingAction } from '@autodealers/inventory';
import {
  applyVehicleListingActionForSeller,
  keepVehicleListingActiveForSeller,
} from '@/lib/vehicle-listing-actions';

const db = getFirestore();

async function resolveVehicleTenantId(
  auth: { tenantId: string; userId: string; dealerId?: string },
  vehicleId: string
): Promise<string | null> {
  const tenantIds = new Set<string>([auth.tenantId]);
  if (auth.dealerId) tenantIds.add(auth.dealerId);

  for (const tenantId of tenantIds) {
    const snap = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .get();
    if (snap.exists) return tenantId;
  }

  const userDoc = await db.collection('users').doc(auth.userId).get();
  const associated = userDoc.data()?.associatedDealers;
  if (Array.isArray(associated)) {
    for (const dealerId of associated) {
      if (typeof dealerId !== 'string') continue;
      const snap = await db
        .collection('tenants')
        .doc(dealerId)
        .collection('vehicles')
        .doc(vehicleId)
        .get();
      if (snap.exists) return dealerId;
    }
  }

  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: vehicleId } = await params;
    const body = await request.json();
    const action = body.action as VehicleListingAction | 'keep_active';
    const showPublicSoldBadge = Boolean(body.showPublicSoldBadge);

    const tenantId = await resolveVehicleTenantId(auth, vehicleId);
    if (!tenantId) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    if (action === 'keep_active') {
      await keepVehicleListingActiveForSeller(tenantId, vehicleId);
    } else if (
      action === 'sold' ||
      action === 'hide' ||
      action === 'reactivate' ||
      action === 'delete'
    ) {
      await applyVehicleListingActionForSeller(tenantId, vehicleId, action, {
        showPublicSoldBadge: action === 'sold' ? showPublicSoldBadge : undefined,
      });
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const updated = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .get();

    return NextResponse.json({
      success: true,
      vehicle: { id: vehicleId, ...updated.data() },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('listing PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import {
  applyVehicleListingAction,
  keepVehicleListingActive,
  notifyDealerOfInventorySale,
  type VehicleListingAction,
} from '@autodealers/inventory';

const db = getFirestore();

async function resolveVehicleTenantId(
  auth: { tenantId: string; userId: string; dealerId?: string },
  vehicleId: string
): Promise<string | null> {
  const tenantIds = [auth.tenantId];
  if (auth.dealerId && auth.dealerId !== auth.tenantId) {
    tenantIds.push(auth.dealerId);
  }

  for (const tenantId of tenantIds) {
    const snap = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .get();
    if (snap.exists) return tenantId;
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: vehicleId } = await params;
    const body = await request.json();
    const action = body.action as VehicleListingAction | 'keep_active';
    const showPublicSoldBadge = Boolean(body.showPublicSoldBadge);

    const tenantId = await resolveVehicleTenantId(
      { tenantId: auth.tenantId, userId: auth.userId, dealerId: auth.dealerId },
      vehicleId
    );
    if (!tenantId) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    if (action === 'keep_active') {
      await keepVehicleListingActive(tenantId, vehicleId);
    } else if (
      action === 'sold' ||
      action === 'hide' ||
      action === 'reactivate' ||
      action === 'delete'
    ) {
      const result = await applyVehicleListingAction(tenantId, vehicleId, action, {
        showPublicSoldBadge: action === 'sold' ? showPublicSoldBadge : undefined,
      });

      // Venta: notificar la baja de inventario al dueño del dealer
      if (action === 'sold') {
        await notifyDealerOfInventorySale(tenantId, result.vehicle, {
          remainingQuantity: result.remainingQuantity ?? 0,
          soldByUserId: auth.userId,
        });
      }
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

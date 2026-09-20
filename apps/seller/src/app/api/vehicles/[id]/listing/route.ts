import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import type { VehicleListingAction } from '@autodealers/inventory';
import { notifyDealerOfInventorySale } from '@autodealers/inventory';
import {
  applyVehicleListingActionForSeller,
  keepVehicleListingActiveForSeller,
} from '@/lib/vehicle-listing-actions';
import { findSellerVehicleById } from '@/lib/seller-vehicles';

const db = getFirestore();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: vehicleId } = await params;
    const body = await request.json();
    const action = body.action as VehicleListingAction | 'keep_active';
    const showPublicSoldBadge = Boolean(body.showPublicSoldBadge);

    // Vender está permitido también sobre inventario sincronizado del dealer;
    // las demás acciones solo sobre vehículos propios.
    const allowDealerInventory = action === 'sold';
    const found = await findSellerVehicleById(auth, vehicleId, { allowDealerInventory });
    if (!found) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }
    const tenantId = found.tenantId;

    if (action === 'keep_active') {
      await keepVehicleListingActiveForSeller(tenantId, vehicleId);
    } else if (
      action === 'sold' ||
      action === 'hide' ||
      action === 'reactivate' ||
      action === 'delete'
    ) {
      const result = await applyVehicleListingActionForSeller(tenantId, vehicleId, action, {
        showPublicSoldBadge: action === 'sold' ? showPublicSoldBadge : undefined,
      });

      // Venta: notificar la baja de inventario al dealer (solo tenants dealer)
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

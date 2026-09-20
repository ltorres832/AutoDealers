export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { applyBulkVehicleAction, type BulkVehicleAction } from '@autodealers/inventory';
import {
  loadVehiclesForSellerWorkspace,
  vehicleBelongsToSeller,
} from '@/lib/seller-vehicles';

const VALID_TYPES = new Set([
  'updatePrice',
  'updateStatus',
  'sold',
  'hide',
  'reactivate',
  'delete',
  'publish',
  'unpublish',
  'setQuantity',
]);

/** Acciones masivas del vendedor: solo sobre vehículos propios de su tenant. */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const vehicleIds: string[] = Array.isArray(body.vehicleIds) ? body.vehicleIds : [];
    const action = body.action as BulkVehicleAction;

    if (vehicleIds.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos un vehículo' }, { status: 400 });
    }
    if (vehicleIds.length > 500) {
      return NextResponse.json({ error: 'Máximo 500 vehículos por operación' }, { status: 400 });
    }
    if (!action || !VALID_TYPES.has(action.type)) {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    // Solo vehículos del vendedor que vivan en su propio tenant
    const all = await loadVehiclesForSellerWorkspace(auth);
    const allowedIds = vehicleIds.filter((id) => {
      const v = all.find((x) => x.id === id);
      return v && v.tenantId === auth.tenantId && vehicleBelongsToSeller(v, auth.userId);
    });

    if (allowedIds.length === 0) {
      return NextResponse.json(
        { error: 'Ninguno de los vehículos seleccionados te pertenece' },
        { status: 403 }
      );
    }

    const result = await applyBulkVehicleAction(auth.tenantId, allowedIds, action);
    return NextResponse.json({
      success: true,
      result,
      skippedNotOwned: vehicleIds.length - allowedIds.length,
    });
  } catch (error) {
    console.error('seller bulk-actions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

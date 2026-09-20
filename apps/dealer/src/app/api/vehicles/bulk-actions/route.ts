export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { applyBulkVehicleAction, type BulkVehicleAction } from '@autodealers/inventory';

const VALID_TYPES = new Set([
  'updatePrice',
  'updateStatus',
  'sold',
  'hide',
  'reactivate',
  'delete',
  'publish',
  'unpublish',
  'assignSeller',
  'setQuantity',
]);

/** Acciones masivas sobre vehículos seleccionados del tenant en contexto. */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const vehicleIds = Array.isArray(body.vehicleIds) ? body.vehicleIds : [];
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

    // Vista multi-dealer: permitir operar otra sede autorizada del usuario
    let targetTenantId = auth.tenantId;
    if (typeof body.tenantId === 'string' && body.tenantId.trim() && body.tenantId !== auth.tenantId) {
      const allowed = new Set<string>([
        auth.tenantId,
        ...(auth.primaryTenantId ? [auth.primaryTenantId] : []),
        ...(auth.associatedDealers || []),
        ...(auth.tenantIds || []),
      ]);
      if (!allowed.has(body.tenantId.trim())) {
        return NextResponse.json({ error: 'No autorizado para ese dealer' }, { status: 403 });
      }
      targetTenantId = body.tenantId.trim();
    }

    const result = await applyBulkVehicleAction(targetTenantId, vehicleIds, action);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('bulk-actions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

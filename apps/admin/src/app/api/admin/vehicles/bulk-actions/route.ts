export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
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
  'setQuantity',
]);

/**
 * Acciones masivas del admin de plataforma. Acepta selección de varios tenants:
 * body.items = [{ tenantId, vehicleIds: [] }] o body.tenantId + body.vehicleIds.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as BulkVehicleAction;
    if (!action || !VALID_TYPES.has(action.type)) {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const items: { tenantId: string; vehicleIds: string[] }[] = Array.isArray(body.items)
      ? body.items
      : body.tenantId && Array.isArray(body.vehicleIds)
        ? [{ tenantId: body.tenantId, vehicleIds: body.vehicleIds }]
        : [];

    const totalIds = items.reduce((n, i) => n + (i.vehicleIds?.length || 0), 0);
    if (items.length === 0 || totalIds === 0) {
      return NextResponse.json({ error: 'Selecciona al menos un vehículo' }, { status: 400 });
    }
    if (totalIds > 500) {
      return NextResponse.json({ error: 'Máximo 500 vehículos por operación' }, { status: 400 });
    }

    const results: Record<string, unknown>[] = [];
    for (const item of items) {
      if (!item.tenantId || !Array.isArray(item.vehicleIds) || item.vehicleIds.length === 0) continue;
      const result = await applyBulkVehicleAction(item.tenantId, item.vehicleIds, action);
      results.push({ tenantId: item.tenantId, ...result });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('admin bulk-actions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

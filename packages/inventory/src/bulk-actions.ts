/**
 * Acciones masivas sobre inventario existente (selección de vehículos).
 */
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { applyVehicleListingAction } from './listing-disposition';

function getDb() {
  return getFirestore();
}

export type BulkVehicleAction =
  | { type: 'updatePrice'; mode: 'set' | 'increaseAmount' | 'decreaseAmount' | 'increasePercent' | 'decreasePercent'; value: number }
  | { type: 'updateStatus'; status: 'available' | 'reserved' }
  | { type: 'sold'; showPublicSoldBadge?: boolean }
  | { type: 'hide' }
  | { type: 'reactivate' }
  | { type: 'delete' }
  | { type: 'publish' }
  | { type: 'unpublish' }
  | { type: 'assignSeller'; sellerId: string }
  | { type: 'setQuantity'; quantity: number };

export interface BulkActionResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: { vehicleId: string; error: string }[];
}

function computeNewPrice(current: number, action: Extract<BulkVehicleAction, { type: 'updatePrice' }>): number {
  const v = action.value;
  let price: number;
  switch (action.mode) {
    case 'set':
      price = v;
      break;
    case 'increaseAmount':
      price = current + v;
      break;
    case 'decreaseAmount':
      price = current - v;
      break;
    case 'increasePercent':
      price = current * (1 + v / 100);
      break;
    case 'decreasePercent':
      price = current * (1 - v / 100);
      break;
  }
  return Math.max(0, Math.round(price));
}

/**
 * Aplica una acción masiva a una lista de vehículos del tenant.
 * Escrituras por lotes; las acciones de listado (sold/hide/delete/reactivate) usan
 * `applyVehicleListingAction` para conservar cantidad y propagación a vendedores.
 */
export async function applyBulkVehicleAction(
  tenantId: string,
  vehicleIds: string[],
  action: BulkVehicleAction
): Promise<BulkActionResult> {
  const db = getDb();
  const result: BulkActionResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };
  const ids = Array.from(new Set(vehicleIds.filter((id) => typeof id === 'string' && id.trim())));
  if (ids.length === 0) return result;

  const vehiclesCol = db.collection('tenants').doc(tenantId).collection('vehicles');
  const ts = getFirestoreFieldValue().serverTimestamp();

  const isListingAction =
    action.type === 'sold' || action.type === 'hide' || action.type === 'delete' || action.type === 'reactivate';

  if (isListingAction) {
    for (const vehicleId of ids) {
      result.processed++;
      try {
        await applyVehicleListingAction(
          tenantId,
          vehicleId,
          action.type === 'sold' ? 'sold' : action.type,
          action.type === 'sold' ? { showPublicSoldBadge: action.showPublicSoldBadge } : {}
        );
        result.succeeded++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          vehicleId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } else {
    let batch = db.batch();
    let ops = 0;
    const flush = async () => {
      if (ops > 0) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    };

    for (const vehicleId of ids) {
      result.processed++;
      try {
        const ref = vehiclesCol.doc(vehicleId);
        switch (action.type) {
          case 'updatePrice': {
            const snap = await ref.get();
            if (!snap.exists) throw new Error('Vehicle not found');
            const current = Number(snap.data()?.price) || 0;
            batch.update(ref, { price: computeNewPrice(current, action), updatedAt: ts });
            break;
          }
          case 'updateStatus':
            batch.update(ref, { status: action.status, updatedAt: ts });
            break;
          case 'publish':
            batch.update(ref, { publishedOnPublicPage: true, updatedAt: ts });
            break;
          case 'unpublish':
            batch.update(ref, { publishedOnPublicPage: false, updatedAt: ts });
            break;
          case 'assignSeller':
            batch.update(ref, { sellerId: action.sellerId, assignedTo: action.sellerId, updatedAt: ts });
            break;
          case 'setQuantity': {
            const qty = Math.max(0, Math.floor(action.quantity));
            const updates: Record<string, any> = { quantity: qty, updatedAt: ts };
            if (qty > 0) {
              // Reposición reactiva el vehículo si estaba agotado
              const snap = await ref.get();
              if (snap.exists && snap.data()?.status === 'sold') {
                updates.status = 'available';
                updates.publishedOnPublicPage = true;
                updates.showSoldBadge = false;
                updates.showPublicSoldBadge = false;
                updates.deleted = false;
              }
            }
            batch.update(ref, updates);
            break;
          }
        }
        ops++;
        result.succeeded++;
        if (ops >= 400) await flush();
      } catch (error) {
        result.failed++;
        result.errors.push({
          vehicleId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    await flush();
  }

  // Refrescar caché público (best-effort)
  try {
    const { syncInventoryToWeb } = await import('./vehicles');
    await syncInventoryToWeb(tenantId);
  } catch (error) {
    console.warn('bulk-actions: error sincronizando caché web:', error);
  }

  return result;
}

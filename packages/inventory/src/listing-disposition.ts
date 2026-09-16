import type { VehicleListingAction } from './types';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/core';

function getDb() {
  return getFirestore();
}

export type ApplyListingActionOptions = {
  /** Si action=sold: mantener visible en web con etiqueta SOLD */
  showPublicSoldBadge?: boolean;
  /** Uso interno: evita re-propagar cuando la acción viene de una propagación dealer→seller. */
  skipDealerPropagation?: boolean;
  /** Uso interno: evita reentrar en sync cross-tenant por VIN. */
  skipVinSoldSync?: boolean;
  /** Motivo de venta (auditoría / sync). */
  soldReason?: string;
};

export type ListingActionResult = {
  /**
   * - 'decremented': el vehículo tenía cantidad > 1; se descontó 1 unidad y sigue disponible.
   * - 'applied': la acción se aplicó por completo (sold/hide/reactivate/delete).
   */
  outcome: 'decremented' | 'applied';
  /** Unidades restantes tras la acción (solo si el vehículo maneja cantidad). */
  remainingQuantity?: number;
  /** Datos del vehículo para notificaciones/propagación. */
  vehicle: {
    id: string;
    vin?: string;
    stockNumber?: string;
    make?: string;
    model?: string;
    year?: number;
  };
};

/**
 * Aplica una acción de listado. Con `action='sold'` y cantidad > 1, descuenta 1 unidad
 * de forma atómica (transacción) y el vehículo sigue disponible; al llegar a 0 se marca
 * vendido y desaparece para todas las cuentas.
 * Las bajas (sold/hide/delete) en tenants dealer se propagan a copias en tenants de
 * vendedores dealer-managed (mismo VIN/stock).
 */
export async function applyVehicleListingAction(
  tenantId: string,
  vehicleId: string,
  action: VehicleListingAction,
  options: ApplyListingActionOptions = {}
): Promise<ListingActionResult> {
  const db = getDb();
  const ref = db.collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);

  const FieldValue = getFirestoreFieldValue();
  const ts = FieldValue.serverTimestamp();
  const base = { updatedAt: ts };

  // Objeto mutable: TypeScript no rastrea asignaciones a `let` dentro del closure de la transacción
  const state: {
    outcome: ListingActionResult['outcome'];
    remainingQuantity?: number;
    vehicleInfo: ListingActionResult['vehicle'];
  } = { outcome: 'applied', vehicleInfo: { id: vehicleId } };

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error('Vehicle not found');
    }
    const data = snap.data() || {};
    state.vehicleInfo = {
      id: vehicleId,
      vin: data.vin || data.specifications?.vin,
      stockNumber: data.stockNumber || data.specifications?.stockNumber,
      make: data.make,
      model: data.model,
      year: data.year,
    };

    switch (action) {
      case 'sold': {
        const quantity = typeof data.quantity === 'number' ? data.quantity : undefined;
        if (quantity !== undefined && quantity > 1) {
          // Lote con unidades: descontar 1, sigue disponible
          state.remainingQuantity = quantity - 1;
          state.outcome = 'decremented';
          tx.update(ref, {
            ...base,
            quantity: FieldValue.increment(-1),
            quantitySold: FieldValue.increment(1),
          });
          return;
        }
        // Última unidad (o unidad única): vendido para todos
        if (quantity !== undefined) state.remainingQuantity = 0;
        const showPublic = Boolean(options.showPublicSoldBadge);
        tx.update(ref, {
          ...base,
          status: 'sold',
          showSoldBadge: true,
          showPublicSoldBadge: showPublic,
          publishedOnPublicPage: showPublic,
          soldAt: ts,
          deleted: false,
          ...(options.soldReason ? { soldReason: options.soldReason } : {}),
          ...(quantity !== undefined
            ? { quantity: 0, quantitySold: FieldValue.increment(1) }
            : {}),
        });
        return;
      }
      case 'hide':
        tx.update(ref, {
          ...base,
          status: 'hidden',
          showSoldBadge: false,
          showPublicSoldBadge: false,
          publishedOnPublicPage: false,
          deleted: false,
        });
        return;
      case 'reactivate':
        tx.update(ref, {
          ...base,
          status: 'available',
          showSoldBadge: false,
          showPublicSoldBadge: false,
          publishedOnPublicPage: true,
          deleted: false,
          soldAt: FieldValue.delete(),
          verificationStatus: FieldValue.delete(),
          vehicleStatus: FieldValue.delete(),
        });
        return;
      case 'delete':
        tx.update(ref, {
          ...base,
          status: 'hidden',
          showSoldBadge: false,
          showPublicSoldBadge: false,
          publishedOnPublicPage: false,
          deleted: true,
        });
        return;
      default:
        throw new Error(`Unknown listing action: ${action}`);
    }
  });

  // Propagar a vendedores dealer-managed con copias del mismo VIN/stock:
  // - sold (agotado o unidad única): la copia se marca vendida
  // - sold con decremento: la copia también descuenta 1 unidad (misma acción 'sold')
  // - hide/delete: la copia se oculta/elimina
  const shouldPropagate = action === 'sold' || action === 'hide' || action === 'delete';
  if (shouldPropagate && !options.skipDealerPropagation) {
    try {
      const { propagateListingActionToDealerSellers } = await import('./dealer-seller-propagation');
      await propagateListingActionToDealerSellers(
        tenantId,
        state.vehicleInfo,
        action === 'sold' ? 'sold' : action === 'hide' ? 'hide' : 'delete',
        { decrementOnly: action === 'sold' && state.outcome === 'decremented' }
      );
    } catch (error) {
      console.warn('applyVehicleListingAction: error propagando a vendedores:', error);
    }
  }

  // Sync cross-tenant por VIN: cualquier listado activo con el mismo VIN queda vendido.
  // Solo cuando la unidad quedó realmente sold (no decremento de lote).
  if (
    action === 'sold' &&
    state.outcome === 'applied' &&
    !options.skipVinSoldSync &&
    state.vehicleInfo.vin
  ) {
    try {
      const { syncSoldStatusByVin } = await import('./vin-sold-sync');
      await syncSoldStatusByVin(tenantId, vehicleId, state.vehicleInfo.vin, {
        showPublicSoldBadge: options.showPublicSoldBadge,
        soldReason: options.soldReason || 'vin_cross_tenant_sync',
      });
    } catch (error) {
      console.warn('applyVehicleListingAction: error en sync VIN sold:', error);
    }
  }

  return {
    outcome: state.outcome,
    remainingQuantity: state.remainingQuantity,
    vehicle: state.vehicleInfo,
  };
}

/** Mantener unidad en venta sin marcar vendida ni ocultar. */
export async function keepVehicleListingActive(
  tenantId: string,
  vehicleId: string
): Promise<void> {
  const ref = getDb().collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
  await ref.update({
    status: 'available',
    showSoldBadge: false,
    showPublicSoldBadge: false,
    publishedOnPublicPage: true,
    deleted: false,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
}

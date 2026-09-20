/**
 * Acciones de listado en inventario del panel vendedor.
 * Delegan en @autodealers/inventory para conservar la lógica de cantidad (lotes),
 * la propagación dealer→vendedores y las notificaciones.
 */
import {
  applyVehicleListingAction,
  keepVehicleListingActive,
  type VehicleListingAction,
  type ListingActionResult,
} from '@autodealers/inventory';

export async function applyVehicleListingActionForSeller(
  tenantId: string,
  vehicleId: string,
  action: VehicleListingAction,
  options?: { showPublicSoldBadge?: boolean }
): Promise<ListingActionResult> {
  return applyVehicleListingAction(tenantId, vehicleId, action, {
    showPublicSoldBadge: options?.showPublicSoldBadge,
  });
}

export async function keepVehicleListingActiveForSeller(
  tenantId: string,
  vehicleId: string
): Promise<void> {
  await keepVehicleListingActive(tenantId, vehicleId);
}

/** Cupo restante de inventario del plan de membresía del tenant. */
export async function computeRemainingInventorySlots(tenantId: string): Promise<number> {
  const { getTenantMembership } = await import('@autodealers/core');
  const membership = await getTenantMembership(tenantId);
  const maxInventory = membership?.features?.maxInventory as number | null | undefined;
  if (maxInventory == null) return Infinity;

  const { getVehicles } = await import('@autodealers/inventory');
  const vehicles = await getVehicles(tenantId, { limit: 8000 });
  return Math.max(0, maxInventory - vehicles.length);
}

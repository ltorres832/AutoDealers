/** Detecta plan Multi Dealer aunque Firestore guarde boolean o string. */
export function isMultiDealerPlan(features: unknown): boolean {
  if (!features || typeof features !== 'object') return false;
  const v = (features as Record<string, unknown>).multiDealerEnabled;
  return v === true || v === 'true';
}

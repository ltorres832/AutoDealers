/** Detecta plan Multi Dealer aunque Firestore use flags históricos o string. */
export function isMultiDealerPlan(features: unknown): boolean {
  if (!features || typeof features !== 'object') return false;
  const f = features as Record<string, unknown>;
  return (
    f.multiDealerEnabled === true ||
    f.multiDealerEnabled === 'true' ||
    f.multipleDealers === true ||
    f.multipleDealers === 'true' ||
    f.customMembershipKind === 'multi_dealer'
  );
}

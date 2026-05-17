import type { MembershipFeatures } from './types';

/**
 * True si el plan permite red multi-concesionario (gestionar varios dealers).
 * Unifica el nombre histórico `multipleDealers` (UI antigua) con `multiDealerEnabled` (seed / billing).
 */
export function membershipAllowsMultiDealerNetwork(
  features: MembershipFeatures | Record<string, unknown> | null | undefined
): boolean {
  if (!features || typeof features !== 'object') return false;
  const f = features as Record<string, unknown>;
  return f.multiDealerEnabled === true || f.multipleDealers === true;
}

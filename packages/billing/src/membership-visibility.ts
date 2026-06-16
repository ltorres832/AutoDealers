import type { MembershipFeatures } from './types';

type MembershipLike = {
  id?: string;
  name?: string;
  type?: string;
  billingCycle?: string | null;
  isActive?: boolean;
  features?: Partial<MembershipFeatures>;
};

const LEGACY_MEMBERSHIP_DOC_IDS = new Set(['dealer', 'seller', 'free']);

/** Excluye placeholders legacy (`memberships/seller`, `memberships/dealer`, etc.). */
export function isCatalogMembership(membership: MembershipLike): boolean {
  const type = membership.type;
  if (type !== 'dealer' && type !== 'seller') return false;
  if (!String(membership.name || '').trim()) return false;

  const id = String(membership.id || '');
  if (LEGACY_MEMBERSHIP_DOC_IDS.has(id)) return false;

  return true;
}

/** Mismo catálogo que Admin: activas + schema válido (sin legacy). */
export function filterPublicCatalogMemberships<T extends MembershipLike>(
  memberships: T[]
): T[] {
  return memberships.filter((m) => isCatalogMembership(m) && m.isActive !== false);
}

/** @deprecated Alias de filterPublicCatalogMemberships — mismo catálogo que admin. */
export function filterSelfServiceMemberships<T extends MembershipLike>(
  memberships: T[]
): T[] {
  return filterPublicCatalogMemberships(memberships);
}

export function assertSelfServiceMembership(
  membership: MembershipLike | null
): { ok: boolean; error?: string } {
  if (!membership) {
    return { ok: false, error: 'Invalid membership' };
  }
  if (!isCatalogMembership(membership)) {
    return { ok: false, error: 'Plan no disponible.' };
  }
  if (membership.isActive === false) {
    return { ok: false, error: 'Este plan está inactivo.' };
  }
  return { ok: true };
}

import { isDealerManagedSeller } from '@/lib/billing-tenant';
import { getFirestore } from '@autodealers/shared';

/** Vendedor con tenant propio tipo `seller` (no gestionado por un concesionario). */
export function isIndependentSellerWorkspace(opts: {
  tenantType?: string | null;
  dealerId?: string | null;
}): boolean {
  return String(opts.tenantType || '').trim() === 'seller' && !isDealerManagedSeller(opts.dealerId);
}

export function sellerCanManageLead(
  auth: { userId: string },
  lead: { assignedTo?: string | null },
  independentWorkspace: boolean
): boolean {
  if (independentWorkspace) return true;
  return lead.assignedTo === auth.userId;
}

export async function resolveIndependentSellerWorkspace(auth: {
  tenantId?: string;
  userId?: string;
  dealerId?: string;
}): Promise<boolean> {
  if (!auth.tenantId || !auth.userId) return false;
  if (isDealerManagedSeller(auth.dealerId)) return false;

  const snap = await getFirestore().collection('tenants').doc(auth.tenantId).get();
  if (!snap.exists) return false;

  const data = snap.data() || {};
  if (String(data.type || '').trim() !== 'seller') return false;

  const ownerId = typeof data.ownerId === 'string' ? data.ownerId.trim() : '';
  return !ownerId || ownerId === auth.userId;
}

export async function assertSellerLeadAccess(
  auth: { tenantId?: string; userId?: string; dealerId?: string },
  lead: { assignedTo?: string | null }
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!auth.userId) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  const independent = await resolveIndependentSellerWorkspace(auth);
  if (!sellerCanManageLead({ userId: auth.userId }, lead, independent)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true };
}

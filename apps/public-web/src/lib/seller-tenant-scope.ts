import type { Firestore } from 'firebase-admin/firestore';

/** Tenants donde puede haber inventario público de un vendedor (propio + dealer vinculado). */
export async function collectTenantIdsForPublicSeller(
  db: Firestore,
  sellerId: string,
  sellerData: Record<string, unknown>,
  primaryTenantId: string
): Promise<string[]> {
  const ids = new Set<string>([primaryTenantId]);

  const addRef = async (ref: unknown) => {
    if (typeof ref !== 'string' || !ref.trim()) return;
    const r = ref.trim();
    const tenantDoc = await db.collection('tenants').doc(r).get();
    if (tenantDoc.exists) {
      ids.add(r);
      return;
    }
    const userDoc = await db.collection('users').doc(r).get();
    const tid = userDoc.data()?.tenantId;
    if (typeof tid === 'string' && tid.trim()) ids.add(tid.trim());
  };

  await addRef(sellerData.dealerId);
  if (Array.isArray(sellerData.associatedDealers)) {
    for (const d of sellerData.associatedDealers) {
      await addRef(d);
    }
  }

  void sellerId; // reservado para trazas futuras por vendedor
  return [...ids];
}

export function resolveTenantPrimarySellerId(tenantData: Record<string, unknown> | null | undefined): string {
  if (!tenantData?.sellerInfo || typeof tenantData.sellerInfo !== 'object') return '';
  const id = (tenantData.sellerInfo as { id?: unknown }).id;
  return typeof id === 'string' ? id.trim() : '';
}

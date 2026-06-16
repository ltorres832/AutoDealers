import { getFirestore } from '@autodealers/core';
import { serializeFirestoreDoc } from '@/lib/serialize-firestore';
import { isCatalogMembership } from '@autodealers/billing/membership-visibility';

export type MembershipListRow = Record<string, unknown> & { id: string };

function isCatalogMembershipRow(row: MembershipListRow): boolean {
  return isCatalogMembership({
    id: row.id,
    name: String(row.name ?? ''),
    type: String(row.type ?? ''),
    billingCycle: (row.billingCycle as string | null | undefined) ?? null,
  });
}

export async function queryMembershipsFromFirestore(options?: {
  type?: 'dealer' | 'seller';
  activeOnly?: boolean;
}): Promise<MembershipListRow[]> {
  const db = getFirestore();
  const snapshot = await db.collection('memberships').get();

  let rows = snapshot.docs
    .map((doc) => serializeFirestoreDoc(doc) as MembershipListRow)
    .filter(isCatalogMembershipRow);

  if (options?.type) {
    rows = rows.filter((m) => m.type === options.type);
  }
  if (options?.activeOnly) {
    rows = rows.filter((m) => m.isActive !== false && m.status !== 'inactive');
  }

  rows.sort((a, b) => {
    const ta = String(a.type ?? '');
    const tb = String(b.type ?? '');
    if (ta !== tb) return ta === 'dealer' ? -1 : 1;
    return (Number(a.price) || 0) - (Number(b.price) || 0);
  });

  return rows;
}

import { getFirestore } from '@autodealers/shared';

/** Lead captado/pagado por un vendedor (publicidad propia, redes, formulario personal, etc.). */
export type SellerOwnedLeadMarker = { sellerOwned?: boolean };

export function isSellerOwnedLead(lead: SellerOwnedLeadMarker): boolean {
  return lead.sellerOwned === true;
}

/** Leads visibles en el CRM del concesionario (excluye los del vendedor por cuenta propia). */
export function isDealerVisibleLead(lead: SellerOwnedLeadMarker): boolean {
  return !isSellerOwnedLead(lead);
}

export function filterDealerVisibleLeads<T extends SellerOwnedLeadMarker>(leads: T[]): T[] {
  return leads.filter(isDealerVisibleLead);
}

export async function resolveSellerOwnedForUserId(userId?: string | null): Promise<{
  sellerOwned: boolean;
  assignedTo?: string;
}> {
  const id = String(userId || '').trim();
  if (!id) return { sellerOwned: false };

  const snap = await getFirestore().collection('users').doc(id).get();
  if (!snap.exists) return { sellerOwned: false };

  if (snap.data()?.role === 'seller') {
    return { sellerOwned: true, assignedTo: id };
  }
  return { sellerOwned: false };
}

export async function sellerOwnedLeadExtras(
  userId?: string | null,
  extraTags: string[] = []
): Promise<{
  sellerOwned?: boolean;
  createdBy?: string;
  assignedTo?: string;
  tags?: string[];
}> {
  const owned = await resolveSellerOwnedForUserId(userId);
  if (!owned.sellerOwned) return {};
  return {
    sellerOwned: true,
    createdBy: owned.assignedTo,
    assignedTo: owned.assignedTo,
    tags: ['vendedor_propio', ...extraTags],
  };
}

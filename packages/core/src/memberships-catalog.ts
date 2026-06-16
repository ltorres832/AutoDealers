/**
 * Catálogo único de membresías (Firestore `memberships`).
 * Todas las apps deben usar estas funciones para listar planes y evitar desajustes.
 */

import { getFirestore } from './firebase';
import type {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
} from 'firebase-admin/firestore';

export type MembershipCatalogType = 'dealer' | 'seller';

export interface MembershipCatalogItem {
  id: string;
  name: string;
  type: MembershipCatalogType;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  isActive: boolean;
  stripePriceId?: string;
  features?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  syncVersion?: number;
  [key: string]: unknown;
}

export interface ListMembershipCatalogOptions {
  type?: MembershipCatalogType;
  /** Si true, solo `isActive === true` */
  activeOnly?: boolean;
  /** Ocultar planes con `features.multiDealerEnabled` */
  excludeMultiDealer?: boolean;
  /** Solo planes multi-concesionario */
  multiDealerOnly?: boolean;
}

function mapDoc(doc: QueryDocumentSnapshot | DocumentSnapshot): MembershipCatalogItem {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ...data,
    price: Number(data.price) || 0,
    currency: String(data.currency || 'USD'),
    billingCycle: (data.billingCycle as 'monthly' | 'yearly') || 'monthly',
    isActive: data.isActive !== false,
    type: data.type as MembershipCatalogType,
    createdAt: data.createdAt?.toDate?.() || undefined,
    updatedAt: data.updatedAt?.toDate?.() || undefined,
  } as MembershipCatalogItem;
}

function applyAudienceFilters(
  list: MembershipCatalogItem[],
  options: ListMembershipCatalogOptions
): MembershipCatalogItem[] {
  let out = list;
  if (options.excludeMultiDealer) {
    out = out.filter((m) => !m.features?.multiDealerEnabled);
  }
  if (options.multiDealerOnly) {
    out = out.filter((m) => Boolean(m.features?.multiDealerEnabled));
  }
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dealer' ? -1 : 1;
    return (a.price || 0) - (b.price || 0);
  });
  return out;
}

/**
 * Lista membresías desde la misma colección para admin, registro público, dealer y seller.
 */
export async function listMembershipCatalog(
  options: ListMembershipCatalogOptions = {}
): Promise<MembershipCatalogItem[]> {
  const db = getFirestore();
  const { type, activeOnly } = options;

  let snapshot: QuerySnapshot;
  try {
    if (type && activeOnly) {
      snapshot = await db
        .collection('memberships')
        .where('type', '==', type)
        .where('isActive', '==', true)
        .get();
    } else if (type) {
      snapshot = await db.collection('memberships').where('type', '==', type).get();
    } else if (activeOnly) {
      snapshot = await db.collection('memberships').where('isActive', '==', true).get();
    } else {
      snapshot = await db.collection('memberships').get();
    }
  } catch (queryError) {
    console.warn('[listMembershipCatalog] Query con filtros falló, usando get() completo:', queryError);
    snapshot = await db.collection('memberships').get();
  }

  let list = snapshot.docs.map((doc) => mapDoc(doc));

  if (type) {
    list = list.filter((m) => m.type === type);
  }
  if (activeOnly) {
    list = list.filter((m) => m.isActive === true);
  }

  return applyAudienceFilters(list, options);
}

export async function getMembershipCatalogById(
  membershipId: string
): Promise<MembershipCatalogItem | null> {
  const id = membershipId.trim();
  if (!id) return null;
  const snap = await getFirestore().collection('memberships').doc(id).get();
  if (!snap.exists) return null;
  return mapDoc(snap);
}

// Gestión de membresías

import { Membership, MembershipType } from './types';
import {
  filterPublicCatalogMemberships,
  isCatalogMembership,
} from './membership-visibility';
import {
  coerceMembershipPrice,
  normalizeMembershipFeatures,
} from './membership-coerce';
import { getFirestoreFieldValue } from '@autodealers/shared';
import { getFirestore } from '@autodealers/core';

// NO inicializar db aquí - se inicializa en cada función
let db: any = null;

function getDb() {
  if (!db) {
    db = getFirestore();
  }
  return db;
}

function isCatalogMembershipRow(
  id: string,
  data: Record<string, unknown>
): data is Record<string, unknown> & { type: MembershipType; name: string } {
  return isCatalogMembership({
    id,
    name: String(data.name || ''),
    type: String(data.type || ''),
    billingCycle: (data.billingCycle as string | null | undefined) ?? null,
    features: (data.features as any) || undefined,
  });
}

/**
 * Crea una nueva membresía
 */
export async function createMembership(
  membership: Omit<Membership, 'id' | 'createdAt'>
): Promise<Membership> {
  const docRef = getDb().collection('memberships').doc();

  const fieldValue = getFirestoreFieldValue();
  await docRef.set({
    ...membership,
    createdAt: fieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...membership,
    createdAt: new Date(),
  };
}

/**
 * Obtiene todas las membresías (para admin)
 */
function mapMembershipDoc(doc: { id: string; data: () => Record<string, unknown> | undefined }): Membership | null {
  const data = doc.data() || {};
  if (!isCatalogMembershipRow(doc.id, data)) return null;
  const createdAt = (data as { createdAt?: { toDate?: () => Date } }).createdAt;
  const isActive =
    data.isActive === false || data.status === 'inactive' ? false : true;
  return {
    id: doc.id,
    ...data,
    price: coerceMembershipPrice(data.price),
    features: normalizeMembershipFeatures(
      (data.features as Record<string, unknown> | undefined) ?? undefined
    ) as unknown as Membership['features'],
    isActive,
    createdAt: createdAt?.toDate?.() || new Date(),
  } as Membership;
}

export async function getMemberships(
  type?: MembershipType
): Promise<Membership[]> {
  const snapshot = await getDb().collection('memberships').get();
  let list = snapshot.docs
    .map(mapMembershipDoc)
    .filter((m): m is Membership => m != null);
  if (type) {
    list = list.filter((m) => m.type === type);
  }
  list.sort((a, b) => (a.price || 0) - (b.price || 0));
  return list;
}

export async function getActiveMemberships(
  type?: MembershipType
): Promise<Membership[]> {
  const all = await getMemberships(type);
  return all.filter((m) => m.isActive !== false);
}

export async function getSelfServiceActiveMemberships(
  type?: MembershipType
): Promise<Membership[]> {
  const all = await getActiveMemberships(type);
  return filterPublicCatalogMemberships(all);
}

export async function getMembershipById(
  membershipId: string
): Promise<Membership | null> {
  if (!membershipId?.trim()) return null;
  const doc = await getDb().collection('memberships').doc(membershipId.trim()).get();
  if (!doc.exists) return null;
  return mapMembershipDoc({ id: doc.id, data: () => doc.data() });
}

/**
 * Actualiza una membresía
 * Limpia todos los valores undefined antes de actualizar
 */
export async function updateMembership(
  membershipId: string,
  updates: Partial<Membership>
): Promise<void> {
  // Función recursiva para limpiar undefined
  function removeUndefined(obj: any): any {
    if (obj === undefined || obj === null) {
      return null; // Firestore acepta null, no undefined
    }
    if (Array.isArray(obj)) {
      return obj.map(removeUndefined);
    }
    if (typeof obj === 'object' && obj !== null) {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  }

  const cleanedUpdates = removeUndefined(updates);

  const fieldValue = getFirestoreFieldValue();
  // Asegurar que updatedAt y syncVersion estén presentes
  const finalUpdates = {
    ...cleanedUpdates,
    updatedAt: fieldValue.serverTimestamp(),
    syncVersion: fieldValue.increment(1),
  };

  console.log('💾 updateMembership - Final updates (no undefined):', JSON.stringify(finalUpdates, null, 2));

  await getDb().collection('memberships').doc(membershipId).update(finalUpdates as any);
}

/**
 * Verifica si una membresía tiene una feature específica
 */
export function hasFeature(
  membership: Membership,
  feature: keyof Membership['features']
): boolean {
  return membership.features[feature] === true;
}

/**
 * Verifica límites de membresía
 */
export function checkLimit(
  membership: Membership,
  limit: 'maxSellers' | 'maxInventory' | 'maxLeadsPerMonth',
  currentCount: number
): boolean {
  const maxLimit = membership.features[limit] as number | undefined;
  if (maxLimit === undefined || maxLimit === null) {
    return true; // Sin límite
  }
  return currentCount < maxLimit;
}

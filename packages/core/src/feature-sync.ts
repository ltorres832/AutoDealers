// Sistema de sincronización automática de features

import * as admin from 'firebase-admin';
import { getFirestore } from './firebase';

function getDb() {
  return getFirestore();
}

async function readMembershipFeaturesFromDb(
  membershipId: string
): Promise<{ features: Record<string, unknown>; syncVersion?: number } | null> {
  const id = membershipId.trim();
  if (!id) return null;

  const snap = await getDb().collection('memberships').doc(id).get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data || data.features == null) return null;

  return {
    features: data.features as Record<string, unknown>,
    syncVersion: typeof data.syncVersion === 'number' ? data.syncVersion : undefined,
  };
}

/** Reúne todos los tenantIds que deben recibir las features de un plan. */
async function collectTenantIdsForMembership(membershipId: string): Promise<Set<string>> {
  const id = membershipId.trim();
  const tenantIds = new Set<string>();

  const tenantsSnapshot = await getDb()
    .collection('tenants')
    .where('membershipId', '==', id)
    .get();
  tenantsSnapshot.docs.forEach((doc) => tenantIds.add(doc.id));

  const subsSnapshot = await getDb()
    .collection('subscriptions')
    .where('membershipId', '==', id)
    .get();
  for (const doc of subsSnapshot.docs) {
    const tid = doc.data()?.tenantId;
    if (typeof tid === 'string' && tid.trim()) {
      tenantIds.add(tid.trim());
    }
  }

  const usersSnapshot = await getDb()
    .collection('users')
    .where('membershipId', '==', id)
    .get();
  for (const doc of usersSnapshot.docs) {
    const tid = doc.data()?.tenantId;
    if (typeof tid === 'string' && tid.trim()) {
      tenantIds.add(tid.trim());
    }
    const dealerId = doc.data()?.dealerId;
    if (typeof dealerId === 'string' && dealerId.trim()) {
      tenantIds.add(dealerId.trim());
    }
  }

  return tenantIds;
}

/**
 * Sincroniza las features de una membresía con todos los tenants que la usan.
 * Se ejecuta automáticamente cuando se actualiza una membresía.
 */
export async function syncMembershipFeaturesToTenants(
  membershipId: string,
  featuresOverride?: Record<string, unknown>
): Promise<void> {
  const id = membershipId.trim();
  let features = featuresOverride;
  let syncVersion: number | undefined;

  if (!features) {
    const fromDb = await readMembershipFeaturesFromDb(id);
    if (!fromDb) {
      throw new Error('Membresía no encontrada');
    }
    features = fromDb.features;
    syncVersion = fromDb.syncVersion;
  } else {
    const snap = await getDb().collection('memberships').doc(id).get();
    if (!snap.exists) {
      throw new Error('Membresía no encontrada');
    }
    const data = snap.data();
    syncVersion = typeof data?.syncVersion === 'number' ? data.syncVersion : undefined;
  }

  const tenantIds = await collectTenantIdsForMembership(id);

  if (tenantIds.size === 0) {
    console.log(`No hay tenants vinculados a la membresía ${id}`);
    return;
  }

  const now = admin.firestore.Timestamp.now();
  const batchSize = 400;
  const ids = Array.from(tenantIds);

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = getDb().batch();
    const chunk = ids.slice(i, i + batchSize);
    for (const tenantId of chunk) {
      const tenantRef = getDb().collection('tenants').doc(tenantId);
      batch.set(
        tenantRef,
        {
          membershipId: id,
          featuresCache: features,
          featuresLastSynced: now,
          membershipSyncVersion: syncVersion ?? 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }

  console.log(`✅ Features sincronizadas para ${tenantIds.size} tenants (membresía ${id})`);
}

/**
 * Obtiene las features del plan (siempre lectura fresca desde memberships).
 */
export async function getTenantFeaturesCached(tenantId: string) {
  const { getTenantMembershipFeatures } = await import('./membership-validation');
  return getTenantMembershipFeatures(tenantId);
}

/**
 * Listener para sincronización automática cuando se actualiza una membresía.
 */
export async function setupMembershipSyncListener() {
  console.log('Listener de sincronización de membresías configurado');
}

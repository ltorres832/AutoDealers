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

/**
 * Sincroniza las features de una membresía con todos los tenants que la usan
 * Se ejecuta automáticamente cuando se actualiza una membresía
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

  const tenantsSnapshot = await getDb().collection('tenants')
    .where('membershipId', '==', id)
    .get();

  if (tenantsSnapshot.empty) {
    console.log(`No hay tenants usando la membresía ${id}`);
    return;
  }

  // Actualizar caché de features para cada tenant
  const batch = getDb().batch();
  const now = admin.firestore.Timestamp.now();

  tenantsSnapshot.docs.forEach((doc) => {
    const tenantRef = getDb().collection('tenants').doc(doc.id);
    batch.update(tenantRef, {
      featuresCache: features,
      featuresLastSynced: now,
      membershipSyncVersion: syncVersion ?? 0,
    });
  });

  await batch.commit();

  console.log(`✅ Features sincronizadas para ${tenantsSnapshot.size} tenants`);
}

/**
 * Obtiene las features desde caché (más rápido) o desde la membresía
 */
export async function getTenantFeaturesCached(tenantId: string) {
  const tenantDoc = await getDb().collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    return null;
  }

  const tenantData = tenantDoc.data();
  const membershipId = tenantData?.membershipId;

  if (!membershipId) {
    return null;
  }

  // Intentar obtener desde caché
  if (tenantData?.featuresCache && tenantData?.featuresLastSynced) {
    const lastSynced = tenantData.featuresLastSynced.toDate();
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSynced.getTime()) / (1000 * 60 * 60);

    // Si la caché tiene menos de 1 hora, usarla
    if (hoursSinceSync < 1) {
      return tenantData.featuresCache;
    }
  }

  const fromDb = await readMembershipFeaturesFromDb(membershipId);
  if (!fromDb) {
    return null;
  }

  await getDb().collection('tenants').doc(tenantId).update({
    featuresCache: fromDb.features,
    featuresLastSynced: admin.firestore.FieldValue.serverTimestamp(),
    membershipSyncVersion: fromDb.syncVersion ?? 0,
  });

  return fromDb.features;
}

/**
 * Listener para sincronización automática cuando se actualiza una membresía
 * Se puede configurar como Cloud Function o ejecutar manualmente
 */
export async function setupMembershipSyncListener() {
  // Esto se ejecutaría como Cloud Function
  // Por ahora, se llama manualmente desde la API de actualización
  console.log('Listener de sincronización de membresías configurado');
}






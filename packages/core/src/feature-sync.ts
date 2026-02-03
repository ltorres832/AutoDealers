// Sistema de sincronización automática de features

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Sincroniza las features de una membresía con todos los tenants que la usan
 * Se ejecuta automáticamente cuando se actualiza una membresía
 */
export async function syncMembershipFeaturesToTenants(membershipId: string): Promise<void> {
  // Import dinámico para evitar dependencia circular
  const { getMembershipById } = await import('@autodealers/billing');
  const membership = await getMembershipById(membershipId);
  if (!membership) {
    throw new Error('Membresía no encontrada');
  }

  // Obtener todos los tenants que usan esta membresía
  const tenantsSnapshot = await getDb().collection('tenants')
    .where('membershipId', '==', membershipId)
    .get();

  if (tenantsSnapshot.empty) {
    console.log(`No hay tenants usando la membresía ${membershipId}`);
    return;
  }

  // Actualizar caché de features para cada tenant
  const batch = getDb().batch();
  const now = admin.firestore.Timestamp.now();

  tenantsSnapshot.docs.forEach((doc) => {
    const tenantRef = getDb().collection('tenants').doc(doc.id);
    batch.update(tenantRef, {
      'featuresCache': membership.features,
      'featuresLastSynced': now,
      'membershipSyncVersion': membership.syncVersion || 0,
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

  // Si no hay caché o está desactualizada, obtener desde la membresía
  // Import dinámico para evitar dependencia circular
  const { getMembershipById } = await import('@autodealers/billing');
  const membership = await getMembershipById(membershipId);
  if (!membership) {
    return null;
  }

  // Actualizar caché
  await getDb().collection('tenants').doc(tenantId).update({
    featuresCache: membership.features,
    featuresLastSynced: admin.firestore.FieldValue.serverTimestamp(),
    membershipSyncVersion: membership.syncVersion || 0,
  });

  return membership.features;
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






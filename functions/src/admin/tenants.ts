/**
 * Cloud Functions para Administración de Tenants (Admin)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Obtener todos los tenants (Admin only)
 */
export const getAllTenants = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  try {
    const tenantsSnapshot = await db.collection('tenants').get();
    const tenants = tenantsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Obtener estadísticas adicionales para cada tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const [usersCount, vehiclesCount, leadsCount] = await Promise.all([
          db.collection('users').where('tenantId', '==', tenant.id).count().get(),
          db.collection('vehicles').where('tenantId', '==', tenant.id).count().get(),
          db.collection('tenants').doc(tenant.id).collection('leads').count().get(),
        ]);

        return {
          ...tenant,
          stats: {
            users: usersCount.data().count,
            vehicles: vehiclesCount.data().count,
            leads: leadsCount.data().count,
          },
        };
      })
    );

    return { tenants: tenantsWithStats };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      'internal',
      'Error al obtener tenants',
      error.message
    );
  }
});

/**
 * Obtener tenant por ID (Admin only)
 */
export const getTenantById = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  const { tenantId } = data;
  if (!tenantId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'tenantId es requerido'
    );
  }

  try {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Tenant no encontrado');
    }

    const [usersCount, vehiclesCount, leadsCount] = await Promise.all([
      db.collection('users').where('tenantId', '==', tenantId).count().get(),
      db.collection('vehicles').where('tenantId', '==', tenantId).count().get(),
      db.collection('tenants').doc(tenantId).collection('leads').count().get(),
    ]);

    return {
      id: tenantDoc.id,
      ...tenantDoc.data(),
      stats: {
        users: usersCount.data().count,
        vehicles: vehiclesCount.data().count,
        leads: leadsCount.data().count,
      },
    };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Error al obtener tenant',
      error.message
    );
  }
});

/**
 * Actualizar tenant (Admin only)
 */
export const updateTenant = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  const { tenantId, updates } = data;
  if (!tenantId || !updates) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'tenantId y updates son requeridos'
    );
  }

  try {
    await db.collection('tenants').doc(tenantId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      'internal',
      'Error al actualizar tenant',
      error.message
    );
  }
});

/**
 * Cambiar estado de tenant (Admin only)
 */
export const updateTenantStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  const { tenantId, status } = data;
  if (!tenantId || !status) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'tenantId y status son requeridos'
    );
  }

  try {
    await db.collection('tenants').doc(tenantId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      'internal',
      'Error al actualizar estado de tenant',
      error.message
    );
  }
});



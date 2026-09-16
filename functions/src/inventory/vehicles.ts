// Cloud Functions para Inventory - Vehicles
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Obtener vehículos del tenant
export const getVehicles = onCall(async (request) => {
  const { tenantId, status, condition, make, model } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId es requerido');
  }

  try {
    let query = db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles') as any;

    if (status) {
      query = query.where('status', '==', status);
    }
    if (condition) {
      query = query.where('condition', '==', condition);
    }
    if (make) {
      query = query.where('make', '==', make);
    }
    if (model) {
      query = query.where('model', '==', model);
    }

    query = query.orderBy('createdAt', 'desc').limit(50);

    const snapshot = await query.get();
    const vehicles = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { vehicles };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener vehículos: ${error.message}`);
  }
});

// Crear un nuevo vehículo
export const createVehicle = onCall(async (request) => {
  const { tenantId, vehicle } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !vehicle) {
    throw new HttpsError('invalid-argument', 'tenantId y vehicle son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc();

    await docRef.set({
      ...vehicle,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear vehículo: ${error.message}`);
  }
});

// Actualizar un vehículo
export const updateVehicle = onCall(async (request) => {
  const { tenantId, vehicleId, updates } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !vehicleId || !updates) {
    throw new HttpsError('invalid-argument', 'tenantId, vehicleId y updates son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al actualizar vehículo: ${error.message}`);
  }
});

// Eliminar un vehículo
export const deleteVehicle = onCall(async (request) => {
  const { tenantId, vehicleId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !vehicleId) {
    throw new HttpsError('invalid-argument', 'tenantId y vehicleId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .delete();

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al eliminar vehículo: ${error.message}`);
  }
});

// Marcar vehículo como vendido (+ sync cross-tenant por VIN)
export const markVehicleAsSold = onCall(async (request) => {
  const { tenantId, vehicleId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !vehicleId) {
    throw new HttpsError('invalid-argument', 'tenantId y vehicleId son requeridos');
  }

  try {
    const ref = db.collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Vehículo no encontrado');
    }
    const data = snap.data() || {};
    const vinRaw = String(data.vin || data.specifications?.vin || '')
      .toUpperCase()
      .replace(/[\s\-]/g, '');
    const now = new Date();

    await ref.update({
      status: 'sold',
      showSoldBadge: true,
      soldAt: now,
      updatedAt: now,
      soldReason: 'mark_sold_callable',
      ...(vinRaw.length === 17 ? { vinNormalized: vinRaw, vin: vinRaw } : {}),
    });

    // Sync cross-tenant por VIN (Admin SDK collection group)
    let synced = 0;
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(vinRaw)) {
      const sourcePath = `tenants/${tenantId}/vehicles/${vehicleId}`;
      const seen = new Set<string>();
      const ingest = async (field: string) => {
        const q = await db.collectionGroup('vehicles').where(field, '==', vinRaw).get();
        for (const doc of q.docs) {
          if (seen.has(doc.ref.path)) continue;
          seen.add(doc.ref.path);
          if (doc.ref.path === sourcePath) continue;
          const d = doc.data() || {};
          if (String(d.status || '').toLowerCase() === 'sold' || d.soldAt) continue;
          if (d.soldSyncedFrom === sourcePath) continue;
          await doc.ref.update({
            status: 'sold',
            showSoldBadge: true,
            showPublicSoldBadge: false,
            publishedOnPublicPage: false,
            soldAt: now,
            deleted: false,
            vinNormalized: vinRaw,
            vin: vinRaw,
            soldReason: 'vin_cross_tenant_sync',
            soldSyncedFrom: sourcePath,
            soldSyncedAt: now,
            soldSyncedSourceTenantId: tenantId,
            soldSyncedSourceVehicleId: vehicleId,
            updatedAt: now,
          });
          synced++;
        }
      };
      try {
        await ingest('vinNormalized');
      } catch (e) {
        console.warn('markVehicleAsSold vinNormalized query:', e);
      }
      try {
        await ingest('vin');
      } catch (e) {
        console.warn('markVehicleAsSold vin query:', e);
      }
    }

    return { success: true, synced };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al marcar vehículo como vendido: ${error.message}`);
  }
});



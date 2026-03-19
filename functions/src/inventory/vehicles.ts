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

// Marcar vehículo como vendido
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
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .update({
        status: 'sold',
        soldAt: new Date(),
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al marcar vehículo como vendido: ${error.message}`);
  }
});



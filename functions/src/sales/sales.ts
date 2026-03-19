// Cloud Functions para Sales
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Obtener ventas del tenant
export const getSales = onCall(async (request) => {
  const { tenantId, leadId, sellerId, vehicleId, status } = request.data;
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
      .collection('sales') as any;

    if (leadId) {
      query = query.where('leadId', '==', leadId);
    }
    if (sellerId) {
      query = query.where('sellerId', '==', sellerId);
    }
    if (vehicleId) {
      query = query.where('vehicleId', '==', vehicleId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc').limit(100);

    const snapshot = await query.get();
    const sales = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { sales };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener ventas: ${error.message}`);
  }
});

// Crear venta
export const createSale = onCall(async (request) => {
  const { tenantId, sale } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !sale) {
    throw new HttpsError('invalid-argument', 'tenantId y sale son requeridos');
  }

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('sales')
      .doc();

    await docRef.set({
      ...sale,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { id: docRef.id };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al crear venta: ${error.message}`);
  }
});

// Completar venta
export const completeSale = onCall(async (request) => {
  const { tenantId, saleId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !saleId) {
    throw new HttpsError('invalid-argument', 'tenantId y saleId son requeridos');
  }

  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('sales')
      .doc(saleId)
      .update({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al completar venta: ${error.message}`);
  }
});



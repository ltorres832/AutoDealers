/**
 * Cloud Functions para Administración de Sellers (Admin)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Obtener todos los sellers (Admin only)
 */
export const getAllSellers = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  try {
    const sellersSnapshot = await db
      .collection('users')
      .where('role', '==', 'seller')
      .get();

    const sellers = await Promise.all(
      sellersSnapshot.docs.map(async (doc) => {
        const sellerData = doc.data();
        
        // Obtener estadísticas del seller
        const [leadsCount, salesCount, revenue] = await Promise.all([
          db.collection('leads')
            .where('assignedTo', '==', doc.id)
            .count()
            .get(),
          db.collection('sales')
            .where('sellerId', '==', doc.id)
            .count()
            .get(),
          db.collection('sales')
            .where('sellerId', '==', doc.id)
            .where('status', '==', 'completed')
            .get()
            .then((snapshot) => {
              return snapshot.docs.reduce((sum, saleDoc) => {
                const sale = saleDoc.data();
                return sum + (sale.totalAmount || 0);
              }, 0);
            }),
        ]);

        return {
          id: doc.id,
          ...sellerData,
          stats: {
            leads: leadsCount.data().count,
            sales: salesCount.data().count,
            revenue,
          },
        };
      })
    );

    return { sellers };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      'internal',
      'Error al obtener sellers',
      error.message
    );
  }
});

/**
 * Obtener seller por ID (Admin only)
 */
export const getSellerById = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  const { sellerId } = data;
  if (!sellerId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'sellerId es requerido'
    );
  }

  try {
    const sellerDoc = await db.collection('users').doc(sellerId).get();
    if (!sellerDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Seller no encontrado');
    }

    const sellerData = sellerDoc.data();
    if (sellerData?.role !== 'seller') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'El usuario no es un seller'
      );
    }

    // Obtener estadísticas
    const [leadsCount, salesCount, revenue] = await Promise.all([
      db.collection('leads')
        .where('assignedTo', '==', sellerId)
        .count()
        .get(),
      db.collection('sales')
        .where('sellerId', '==', sellerId)
        .count()
        .get(),
      db.collection('sales')
        .where('sellerId', '==', sellerId)
        .where('status', '==', 'completed')
        .get()
        .then((snapshot) => {
          return snapshot.docs.reduce((sum, saleDoc) => {
            const sale = saleDoc.data();
            return sum + (sale.totalAmount || 0);
          }, 0);
        }),
    ]);

    return {
      id: sellerDoc.id,
      ...sellerData,
      stats: {
        leads: leadsCount.data().count,
        sales: salesCount.data().count,
        revenue,
      },
    };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Error al obtener seller',
      error.message
    );
  }
});

/**
 * Actualizar seller (Admin only)
 */
export const updateSeller = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  const { sellerId, updates } = data;
  if (!sellerId || !updates) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'sellerId y updates son requeridos'
    );
  }

  try {
    await db.collection('users').doc(sellerId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      'internal',
      'Error al actualizar seller',
      error.message
    );
  }
});



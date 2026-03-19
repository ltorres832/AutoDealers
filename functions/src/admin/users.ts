/**
 * Cloud Functions para Administración de Usuarios (Admin)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const auth = admin.auth();

/**
 * Obtener todos los usuarios (Admin only)
 */
export const getAllUsers = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario es admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  try {
    const usersSnapshot = await db.collection('users').get();
    const users = await Promise.all(
      usersSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        let authUser = null;
        try {
          authUser = await auth.getUser(doc.id);
        } catch (e) {
          // Usuario puede no existir en Auth
        }
        return {
          id: doc.id,
          ...userData,
          email: authUser?.email || userData.email,
          disabled: authUser?.disabled || false,
        };
      })
    );
    return { users };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      'internal',
      'Error al obtener usuarios',
      error.message
    );
  }
});

/**
 * Obtener usuario por ID (Admin only)
 */
export const getUserById = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId es requerido'
    );
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
    }

    let authUser = null;
    try {
      authUser = await auth.getUser(userId);
    } catch (e) {
      // Usuario puede no existir en Auth
    }

    return {
      id: userDoc.id,
      ...userDoc.data(),
      email: authUser?.email || userDoc.data()?.email,
      disabled: authUser?.disabled || false,
    };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Error al obtener usuario',
      error.message
    );
  }
});

/**
 * Actualizar usuario (Admin only)
 */
export const updateUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  const { userId, updates } = data;
  if (!userId || !updates) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId y updates son requeridos'
    );
  }

  try {
    await db.collection('users').doc(userId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Si se actualiza el estado disabled, actualizar Auth también
    if (updates.disabled !== undefined) {
      await auth.updateUser(userId, {
        disabled: updates.disabled,
      });
    }

    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      'internal',
      'Error al actualizar usuario',
      error.message
    );
  }
});

/**
 * Cambiar estado de usuario (Admin only)
 */
export const updateUserStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden acceder a esta función'
    );
  }

  const { userId, status } = data;
  if (!userId || !status) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId y status son requeridos'
    );
  }

  try {
    await db.collection('users').doc(userId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Actualizar Auth si es necesario
    if (status === 'suspended' || status === 'inactive') {
      await auth.updateUser(userId, { disabled: true });
    } else if (status === 'active') {
      await auth.updateUser(userId, { disabled: false });
    }

    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      'internal',
      'Error al actualizar estado de usuario',
      error.message
    );
  }
});



// Cloud Functions para Referrals
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Obtener código de referido
export const getReferralCode = onCall(async (request) => {
  const { userId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId es requerido');
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userDoc.data();
    let referralCode = userData?.referralCode;

    // Generar código si no existe
    if (!referralCode) {
      referralCode = `REF${userId.substring(0, 8).toUpperCase()}`;
      await db.collection('users').doc(userId).update({
        referralCode,
      });
    }

    return { referralCode };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al obtener código de referido: ${error.message}`);
  }
});

// Obtener referidos del usuario
export const getMyReferrals = onCall(async (request) => {
  const { userId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId es requerido');
  }

  try {
    const snapshot = await db
      .collection('referrals')
      .where('referrerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const referrals = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      confirmedAt: doc.data().confirmedAt?.toDate(),
      rewardsGrantedAt: doc.data().rewardsGrantedAt?.toDate(),
    }));

    return { referrals };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener referidos: ${error.message}`);
  }
});

// Obtener recompensas del usuario
export const getMyRewards = onCall(async (request) => {
  const { userId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId es requerido');
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userDoc.data();
    const rewards = {
      totalCredits: userData?.referralCredits || 0,
      pendingCredits: userData?.pendingReferralCredits || 0,
      usedCredits: userData?.usedReferralCredits || 0,
    };

    return { rewards };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al obtener recompensas: ${error.message}`);
  }
});

// Usar código de referido
export const useReferralCode = onCall(async (request) => {
  const { referralCode, newUserId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!referralCode || !newUserId) {
    throw new HttpsError('invalid-argument', 'referralCode y newUserId son requeridos');
  }

  try {
    // Buscar usuario con ese código
    const usersSnapshot = await db
      .collection('users')
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      throw new HttpsError('not-found', 'Código de referido inválido');
    }

    const referrerDoc = usersSnapshot.docs[0];
    const referrerId = referrerDoc.id;

    // Verificar que no se esté refiriendo a sí mismo
    if (referrerId === newUserId) {
      throw new HttpsError('invalid-argument', 'No puedes usar tu propio código');
    }

    // Verificar que no exista ya un referral
    const existingReferral = await db
      .collection('referrals')
      .where('referredId', '==', newUserId)
      .limit(1)
      .get();

    if (!existingReferral.empty) {
      throw new HttpsError('already-exists', 'Ya existe un referral para este usuario');
    }

    // Crear referral
    const referralRef = db.collection('referrals').doc();
    await referralRef.set({
      referrerId,
      referredId: newUserId,
      referralCode,
      status: 'pending',
      createdAt: new Date(),
    });

    return { success: true, referralId: referralRef.id };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Error al usar código de referido: ${error.message}`);
  }
});

// Obtener todos los referrals (admin)
export const getAllReferrals = onCall(async (request) => {
  const { status, userId, limit } = request.data;
  const auth = request.auth;

  if (!auth || auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores');
  }

  try {
    let query = db.collection('referrals').orderBy('createdAt', 'desc') as any;

    if (status) {
      query = query.where('status', '==', status);
    }
    if (userId) {
      query = query.where('referrerId', '==', userId);
    }

    const snapshot = await query.limit(limit || 100).get();
    const referrals = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      confirmedAt: doc.data().confirmedAt?.toDate(),
      rewardsGrantedAt: doc.data().rewardsGrantedAt?.toDate(),
    }));

    // Estadísticas
    const allSnapshot = await db.collection('referrals').get();
    const stats = {
      total: allSnapshot.size,
      pending: allSnapshot.docs.filter((d) => d.data().status === 'pending').length,
      confirmed: allSnapshot.docs.filter((d) => d.data().status === 'confirmed').length,
      rewarded: allSnapshot.docs.filter((d) => d.data().status === 'rewarded').length,
    };

    return { referrals, stats };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al obtener referrals: ${error.message}`);
  }
});



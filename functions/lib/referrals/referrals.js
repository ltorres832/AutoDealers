"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllReferrals = exports.useReferralCode = exports.getMyRewards = exports.getMyReferrals = exports.getReferralCode = void 0;
// Cloud Functions para Referrals
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Obtener código de referido
exports.getReferralCode = (0, https_1.onCall)(async (request) => {
    const { userId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!userId) {
        throw new https_1.HttpsError('invalid-argument', 'userId es requerido');
    }
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Usuario no encontrado');
        }
        const userData = userDoc.data();
        let referralCode = userData === null || userData === void 0 ? void 0 : userData.referralCode;
        // Generar código si no existe
        if (!referralCode) {
            referralCode = `REF${userId.substring(0, 8).toUpperCase()}`;
            await db.collection('users').doc(userId).update({
                referralCode,
            });
        }
        return { referralCode };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al obtener código de referido: ${error.message}`);
    }
});
// Obtener referidos del usuario
exports.getMyReferrals = (0, https_1.onCall)(async (request) => {
    const { userId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!userId) {
        throw new https_1.HttpsError('invalid-argument', 'userId es requerido');
    }
    try {
        const snapshot = await db
            .collection('referrals')
            .where('referrerId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        const referrals = snapshot.docs.map((doc) => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), confirmedAt: (_b = doc.data().confirmedAt) === null || _b === void 0 ? void 0 : _b.toDate(), rewardsGrantedAt: (_c = doc.data().rewardsGrantedAt) === null || _c === void 0 ? void 0 : _c.toDate() }));
        });
        return { referrals };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener referidos: ${error.message}`);
    }
});
// Obtener recompensas del usuario
exports.getMyRewards = (0, https_1.onCall)(async (request) => {
    const { userId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!userId) {
        throw new https_1.HttpsError('invalid-argument', 'userId es requerido');
    }
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Usuario no encontrado');
        }
        const userData = userDoc.data();
        const rewards = {
            totalCredits: (userData === null || userData === void 0 ? void 0 : userData.referralCredits) || 0,
            pendingCredits: (userData === null || userData === void 0 ? void 0 : userData.pendingReferralCredits) || 0,
            usedCredits: (userData === null || userData === void 0 ? void 0 : userData.usedReferralCredits) || 0,
        };
        return { rewards };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al obtener recompensas: ${error.message}`);
    }
});
// Usar código de referido
exports.useReferralCode = (0, https_1.onCall)(async (request) => {
    const { referralCode, newUserId } = request.data;
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    if (!referralCode || !newUserId) {
        throw new https_1.HttpsError('invalid-argument', 'referralCode y newUserId son requeridos');
    }
    try {
        // Buscar usuario con ese código
        const usersSnapshot = await db
            .collection('users')
            .where('referralCode', '==', referralCode)
            .limit(1)
            .get();
        if (usersSnapshot.empty) {
            throw new https_1.HttpsError('not-found', 'Código de referido inválido');
        }
        const referrerDoc = usersSnapshot.docs[0];
        const referrerId = referrerDoc.id;
        // Verificar que no se esté refiriendo a sí mismo
        if (referrerId === newUserId) {
            throw new https_1.HttpsError('invalid-argument', 'No puedes usar tu propio código');
        }
        // Verificar que no exista ya un referral
        const existingReferral = await db
            .collection('referrals')
            .where('referredId', '==', newUserId)
            .limit(1)
            .get();
        if (!existingReferral.empty) {
            throw new https_1.HttpsError('already-exists', 'Ya existe un referral para este usuario');
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
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', `Error al usar código de referido: ${error.message}`);
    }
});
// Obtener todos los referrals (admin)
exports.getAllReferrals = (0, https_1.onCall)(async (request) => {
    const { status, userId, limit } = request.data;
    const auth = request.auth;
    if (!auth || auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores');
    }
    try {
        let query = db.collection('referrals').orderBy('createdAt', 'desc');
        if (status) {
            query = query.where('status', '==', status);
        }
        if (userId) {
            query = query.where('referrerId', '==', userId);
        }
        const snapshot = await query.limit(limit || 100).get();
        const referrals = snapshot.docs.map((doc) => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), confirmedAt: (_b = doc.data().confirmedAt) === null || _b === void 0 ? void 0 : _b.toDate(), rewardsGrantedAt: (_c = doc.data().rewardsGrantedAt) === null || _c === void 0 ? void 0 : _c.toDate() }));
        });
        // Estadísticas
        const allSnapshot = await db.collection('referrals').get();
        const stats = {
            total: allSnapshot.size,
            pending: allSnapshot.docs.filter((d) => d.data().status === 'pending').length,
            confirmed: allSnapshot.docs.filter((d) => d.data().status === 'confirmed').length,
            rewarded: allSnapshot.docs.filter((d) => d.data().status === 'rewarded').length,
        };
        return { referrals, stats };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', `Error al obtener referrals: ${error.message}`);
    }
});
//# sourceMappingURL=referrals.js.map
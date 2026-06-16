"use strict";
// Sistema de calificaciones (ratings)
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPendingRating = createPendingRating;
exports.completeRating = completeRating;
exports.getRatingByToken = getRatingByToken;
exports.getUserRating = getUserRating;
const shared_1 = require("@autodealers/shared");
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea una nueva calificación pendiente cuando se marca un vehículo como vendido
 */
async function createPendingRating(tenantId, saleId, vehicleId, sellerId, dealerId, customerEmail, customerName) {
    // Generar token único para la encuesta
    const surveyToken = `${tenantId}_${saleId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    // La encuesta expira en 30 días
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const ratingRef = getDb().collection('tenants')
        .doc(tenantId)
        .collection('ratings')
        .doc();
    const ratingData = {
        tenantId,
        saleId,
        vehicleId,
        sellerId,
        dealerId,
        customerEmail,
        customerName,
        sellerRating: 0,
        dealerRating: dealerId ? 0 : undefined,
        status: 'pending',
        surveyToken,
        createdAt: new Date(),
        expiresAt,
    };
    await ratingRef.set({
        ...ratingData,
        createdAt: (0, shared_1.getFirestoreFieldValue)().serverTimestamp(),
        expiresAt: (0, shared_1.getFirestoreFieldValue)().Timestamp.fromDate(expiresAt),
    });
    return {
        id: ratingRef.id,
        ...ratingData,
    };
}
/**
 * Completa una calificación con las respuestas del cliente
 */
async function completeRating(tenantId, ratingId, sellerRating, dealerRating, sellerComment, dealerComment) {
    const ratingRef = getDb().collection('tenants')
        .doc(tenantId)
        .collection('ratings')
        .doc(ratingId);
    const ratingDoc = await ratingRef.get();
    if (!ratingDoc.exists) {
        throw new Error('Rating not found');
    }
    const ratingData = ratingDoc.data();
    if (ratingData?.status !== 'pending') {
        throw new Error('Rating already completed or expired');
    }
    await ratingRef.update({
        sellerRating,
        dealerRating: dealerRating || undefined,
        sellerComment: sellerComment || undefined,
        dealerComment: dealerComment || undefined,
        status: 'completed',
        completedAt: (0, shared_1.getFirestoreFieldValue)().serverTimestamp(),
    });
    // Actualizar promedios de calificaciones del vendedor y dealer
    await updateUserRatingAverage(tenantId, ratingData.sellerId, 'seller');
    if (ratingData.dealerId) {
        await updateUserRatingAverage(tenantId, ratingData.dealerId, 'dealer');
    }
}
/**
 * Obtiene una calificación por su token de encuesta
 */
async function getRatingByToken(surveyToken) {
    // Buscar en todos los tenants (el token es único)
    const tenantsSnapshot = await getDb().collection('tenants').get();
    for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const ratingsSnapshot = await getDb().collection('tenants')
            .doc(tenantId)
            .collection('ratings')
            .where('surveyToken', '==', surveyToken)
            .limit(1)
            .get();
        if (!ratingsSnapshot.empty) {
            const doc = ratingsSnapshot.docs[0];
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                completedAt: data.completedAt?.toDate(),
                expiresAt: data.expiresAt?.toDate() || new Date(),
            };
        }
    }
    return null;
}
/**
 * Actualiza el promedio de calificaciones de un usuario (vendedor o dealer)
 */
async function updateUserRatingAverage(tenantId, userId, userType) {
    // Obtener todas las calificaciones completadas del usuario
    const ratingsSnapshot = await getDb().collection('tenants')
        .doc(tenantId)
        .collection('ratings')
        .where(userType === 'seller' ? 'sellerId' : 'dealerId', '==', userId)
        .where('status', '==', 'completed')
        .get();
    const ratings = ratingsSnapshot.docs.map(doc => doc.data());
    if (ratings.length === 0) {
        return;
    }
    // Calcular promedio
    const ratingField = userType === 'seller' ? 'sellerRating' : 'dealerRating';
    const totalRating = ratings.reduce((sum, rating) => sum + (rating[ratingField] || 0), 0);
    const averageRating = totalRating / ratings.length;
    // Actualizar en el documento del usuario
    const userRef = getDb().collection('users').doc(userId);
    await userRef.update({
        [`${userType}Rating`]: averageRating,
        [`${userType}RatingCount`]: ratings.length,
        [`${userType}RatingUpdatedAt`]: (0, shared_1.getFirestoreFieldValue)().serverTimestamp(),
    });
}
/**
 * Obtiene el promedio de calificaciones de un usuario
 */
async function getUserRating(userId, userType) {
    const userDoc = await getDb().collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) {
        return { average: 0, count: 0 };
    }
    const ratingField = `${userType}Rating`;
    const countField = `${userType}RatingCount`;
    return {
        average: userData[ratingField] || 0,
        count: userData[countField] || 0,
    };
}

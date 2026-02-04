"use strict";
// Sistema de reseñas (reviews)
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReview = createReview;
exports.getReviews = getReviews;
exports.getPublicReviews = getPublicReviews;
exports.getReviewById = getReviewById;
exports.updateReview = updateReview;
exports.deleteReview = deleteReview;
exports.addReviewResponse = addReviewResponse;
exports.getReviewStats = getReviewStats;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Crea una nueva reseña
 */
async function createReview(reviewData) {
    const docRef = db
        .collection('tenants')
        .doc(reviewData.tenantId)
        .collection('reviews')
        .doc();
    const reviewToSave = {
        ...reviewData,
        status: reviewData.status || 'pending',
        featured: reviewData.featured || false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRef.set(reviewToSave);
    return {
        id: docRef.id,
        ...reviewData,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene todas las reseñas de un tenant
 */
async function getReviews(tenantId, filters) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('reviews');
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    if (filters?.featured !== undefined) {
        query = query.where('featured', '==', filters.featured);
    }
    if (filters?.minRating) {
        query = query.where('rating', '>=', filters.minRating);
    }
    // Ordenar por fecha de creación (más recientes primero)
    query = query.orderBy('createdAt', 'desc');
    if (filters?.limit) {
        query = query.limit(filters.limit);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
            response: data?.response
                ? {
                    ...data.response,
                    respondedAt: data.response.respondedAt?.toDate() || new Date(),
                }
                : undefined,
        };
    });
}
/**
 * Obtiene reseñas aprobadas para mostrar públicamente
 */
async function getPublicReviews(tenantId, limit) {
    return getReviews(tenantId, {
        status: 'approved',
        limit: limit || 50,
    });
}
/**
 * Obtiene una reseña por ID
 */
async function getReviewById(tenantId, reviewId) {
    const doc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('reviews')
        .doc(reviewId)
        .get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
        response: data?.response
            ? {
                ...data.response,
                respondedAt: data.response.respondedAt?.toDate() || new Date(),
            }
            : undefined,
    };
}
/**
 * Actualiza una reseña
 */
async function updateReview(tenantId, reviewId, updates) {
    const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // No permitir actualizar id, tenantId, createdAt
    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.createdAt;
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('reviews')
        .doc(reviewId)
        .update(updateData);
}
/**
 * Elimina una reseña
 */
async function deleteReview(tenantId, reviewId) {
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('reviews')
        .doc(reviewId)
        .delete();
}
/**
 * Agrega una respuesta a una reseña
 */
async function addReviewResponse(tenantId, reviewId, responseText, respondedBy) {
    await updateReview(tenantId, reviewId, {
        response: {
            text: responseText,
            respondedBy,
            respondedAt: new Date(),
        },
    });
}
/**
 * Obtiene estadísticas de reseñas
 */
async function getReviewStats(tenantId) {
    const allReviews = await getReviews(tenantId);
    const stats = {
        total: allReviews.length,
        approved: allReviews.filter((r) => r.status === 'approved').length,
        pending: allReviews.filter((r) => r.status === 'pending').length,
        rejected: allReviews.filter((r) => r.status === 'rejected').length,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    if (allReviews.length > 0) {
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        stats.averageRating = totalRating / allReviews.length;
        allReviews.forEach((review) => {
            stats.ratingDistribution[review.rating] =
                (stats.ratingDistribution[review.rating] || 0) + 1;
        });
    }
    return stats;
}
//# sourceMappingURL=reviews.js.map
"use strict";
// Cloud Functions para Testimonials
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
exports.deleteTestimonial = exports.updateTestimonial = exports.createTestimonial = exports.getTestimonials = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const db = (0, firestore_1.getFirestore)();
/**
 * Obtener testimonials
 */
exports.getTestimonials = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        const { activeOnly } = request.data;
        let query = db.collection('testimonials');
        if (activeOnly !== false) {
            query = query.where('isActive', '!=', false);
        }
        query = query.orderBy('order', 'asc').limit(50);
        const snapshot = await query.get();
        const testimonials = snapshot.docs
            .map((doc) => (Object.assign({ id: doc.id }, doc.data())))
            .filter((t) => t.isActive !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        return { testimonials };
    }
    catch (error) {
        console.error('Error getting testimonials:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to get testimonials: ${error.message}`);
    }
});
/**
 * Crear testimonial
 */
exports.createTestimonial = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can create testimonials');
        }
        const { name, role, text, image, rating, order } = request.data;
        if (!name || !role || !text) {
            throw new https_1.HttpsError('invalid-argument', 'Name, role and text are required');
        }
        const testimonialData = {
            name,
            role,
            text,
            image: image || '👤',
            rating: rating || 5,
            order: order || 0,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const docRef = await db.collection('testimonials').add(testimonialData);
        return {
            success: true,
            testimonial: Object.assign({ id: docRef.id }, testimonialData),
        };
    }
    catch (error) {
        console.error('Error creating testimonial:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to create testimonial: ${error.message}`);
    }
});
/**
 * Actualizar testimonial
 */
exports.updateTestimonial = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can update testimonials');
        }
        const { testimonialId, updates } = request.data;
        if (!testimonialId || !updates) {
            throw new https_1.HttpsError('invalid-argument', 'Testimonial ID and updates are required');
        }
        await db.collection('testimonials').doc(testimonialId).update(Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        return { success: true };
    }
    catch (error) {
        console.error('Error updating testimonial:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to update testimonial: ${error.message}`);
    }
});
/**
 * Eliminar testimonial
 */
exports.deleteTestimonial = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verificar que sea admin
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can delete testimonials');
        }
        const { testimonialId } = request.data;
        if (!testimonialId) {
            throw new https_1.HttpsError('invalid-argument', 'Testimonial ID is required');
        }
        await db.collection('testimonials').doc(testimonialId).delete();
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting testimonial:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to delete testimonial: ${error.message}`);
    }
});
//# sourceMappingURL=testimonials.js.map
// Cloud Functions para Testimonials

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener testimonials
 */
export const getTestimonials = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { activeOnly } = request.data;

      let query: admin.firestore.Query = db.collection('testimonials');

      if (activeOnly !== false) {
        query = query.where('isActive', '!=', false);
      }

      query = query.orderBy('order', 'asc').limit(50);

      const snapshot = await query.get();

      const testimonials = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((t: any) => t.isActive !== false)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

      return { testimonials };
    } catch (error: any) {
      console.error('Error getting testimonials:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get testimonials: ${error.message}`);
    }
  }
);

/**
 * Crear testimonial
 */
export const createTestimonial = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Verificar que sea admin
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();
      
      if (userData?.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can create testimonials');
      }

      const { name, role, text, image, rating, order } = request.data;

      if (!name || !role || !text) {
        throw new HttpsError('invalid-argument', 'Name, role and text are required');
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
        testimonial: {
          id: docRef.id,
          ...testimonialData,
        },
      };
    } catch (error: any) {
      console.error('Error creating testimonial:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to create testimonial: ${error.message}`);
    }
  }
);

/**
 * Actualizar testimonial
 */
export const updateTestimonial = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Verificar que sea admin
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();
      
      if (userData?.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can update testimonials');
      }

      const { testimonialId, updates } = request.data;

      if (!testimonialId || !updates) {
        throw new HttpsError('invalid-argument', 'Testimonial ID and updates are required');
      }

      await db.collection('testimonials').doc(testimonialId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating testimonial:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update testimonial: ${error.message}`);
    }
  }
);

/**
 * Eliminar testimonial
 */
export const deleteTestimonial = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Verificar que sea admin
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();
      
      if (userData?.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can delete testimonials');
      }

      const { testimonialId } = request.data;

      if (!testimonialId) {
        throw new HttpsError('invalid-argument', 'Testimonial ID is required');
      }

      await db.collection('testimonials').doc(testimonialId).delete();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting testimonial:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to delete testimonial: ${error.message}`);
    }
  }
);



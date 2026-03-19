// Cloud Functions para FAQs

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener FAQs activas
 */
export const getFAQs = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { tenantId, activeOnly } = request.data;

      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'Tenant ID is required');
      }

      let query: admin.firestore.Query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('faqs');

      if (activeOnly !== false) {
        query = query.where('isActive', '==', true);
      }

      query = query.orderBy('order', 'asc');

      const snapshot = await query.get();

      const faqs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date(),
          updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
      });

      return { faqs };
    } catch (error: any) {
      console.error('Error getting FAQs:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get FAQs: ${error.message}`);
    }
  }
);

/**
 * Crear FAQ
 */
export const createFAQ = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, question, answer, category, keywords, isActive, order } = request.data;

      if (!tenantId || !question || !answer) {
        throw new HttpsError('invalid-argument', 'Tenant ID, question and answer are required');
      }

      const faqRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('faqs')
        .doc();

      const faqData = {
        tenantId,
        question,
        answer,
        category: category || '',
        keywords: keywords || [],
        isActive: isActive !== undefined ? isActive : true,
        order: order || 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await faqRef.set(faqData);

      return {
        faq: {
          id: faqRef.id,
          ...faqData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error: any) {
      console.error('Error creating FAQ:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to create FAQ: ${error.message}`);
    }
  }
);

/**
 * Actualizar FAQ
 */
export const updateFAQ = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, faqId, updates } = request.data;

      if (!tenantId || !faqId || !updates) {
        throw new HttpsError('invalid-argument', 'Tenant ID, FAQ ID and updates are required');
      }

      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('faqs')
        .doc(faqId)
        .update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating FAQ:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update FAQ: ${error.message}`);
    }
  }
);

/**
 * Eliminar FAQ
 */
export const deleteFAQ = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, faqId } = request.data;

      if (!tenantId || !faqId) {
        throw new HttpsError('invalid-argument', 'Tenant ID and FAQ ID are required');
      }

      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('faqs')
        .doc(faqId)
        .delete();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting FAQ:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to delete FAQ: ${error.message}`);
    }
  }
);



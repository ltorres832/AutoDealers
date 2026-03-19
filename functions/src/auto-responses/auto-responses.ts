// Cloud Functions para Auto-Responses

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener respuestas automáticas activas
 */
export const getAutoResponses = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, activeOnly } = request.data;

      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'Tenant ID is required');
      }

      let query: admin.firestore.Query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('auto_responses');

      if (activeOnly !== false) {
        query = query.where('isActive', '==', true);
      }

      query = query.orderBy('priority', 'desc');

      const snapshot = await query.get();

      const responses = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date(),
          updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
      });

      return { responses };
    } catch (error: any) {
      console.error('Error getting auto responses:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get auto responses: ${error.message}`);
    }
  }
);

/**
 * Crear respuesta automática
 */
export const createAutoResponse = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, name, trigger, response, channels, isActive, priority } = request.data;

      if (!tenantId || !name || !trigger || !response || !channels) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
      }

      const responseRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('auto_responses')
        .doc();

      const responseData = {
        tenantId,
        name,
        trigger,
        response,
        channels,
        isActive: isActive !== undefined ? isActive : true,
        priority: priority || 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await responseRef.set(responseData);

      return {
        response: {
          id: responseRef.id,
          ...responseData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error: any) {
      console.error('Error creating auto response:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to create auto response: ${error.message}`);
    }
  }
);

/**
 * Actualizar respuesta automática
 */
export const updateAutoResponse = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, responseId, updates } = request.data;

      if (!tenantId || !responseId || !updates) {
        throw new HttpsError('invalid-argument', 'Tenant ID, Response ID and updates are required');
      }

      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('auto_responses')
        .doc(responseId)
        .update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating auto response:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update auto response: ${error.message}`);
    }
  }
);

/**
 * Eliminar respuesta automática
 */
export const deleteAutoResponse = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, responseId } = request.data;

      if (!tenantId || !responseId) {
        throw new HttpsError('invalid-argument', 'Tenant ID and Response ID are required');
      }

      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('auto_responses')
        .doc(responseId)
        .delete();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting auto response:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to delete auto response: ${error.message}`);
    }
  }
);



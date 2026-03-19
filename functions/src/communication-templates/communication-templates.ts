// Cloud Functions para Communication Templates

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener templates de comunicación
 */
export const getCommunicationTemplates = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { category, channel, role } = request.data;

      let query: admin.firestore.Query = db.collection('communication_templates');

      if (category) {
        query = query.where('category', '==', category);
      }

      if (channel) {
        query = query.where('channel', '==', channel);
      }

      if (role) {
        query = query.where('role', '==', role);
      }

      query = query.where('isActive', '==', true).orderBy('name', 'asc');

      const snapshot = await query.get();

      const templates = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date(),
          updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
      });

      return { templates };
    } catch (error: any) {
      console.error('Error getting communication templates:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get communication templates: ${error.message}`);
    }
  }
);

/**
 * Crear template de comunicación (solo admin)
 */
export const createCommunicationTemplate = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can create communication templates');
      }

      const { name, category, channel, role, subject, body, variables, isActive } = request.data;

      if (!name || !category || !channel || !body) {
        throw new HttpsError('invalid-argument', 'Name, category, channel and body are required');
      }

      const templateRef = db.collection('communication_templates').doc();

      const templateData = {
        name,
        category, // 'email', 'sms', 'whatsapp', 'facebook', 'instagram'
        channel, // 'lead_followup', 'appointment_reminder', 'sale_confirmation', etc.
        role: role || 'all', // 'admin', 'dealer', 'seller', 'all'
        subject: subject || '',
        body,
        variables: variables || [], // Variables disponibles para reemplazar
        isActive: isActive !== undefined ? isActive : true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await templateRef.set(templateData);

      return {
        template: {
          id: templateRef.id,
          ...templateData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error: any) {
      console.error('Error creating communication template:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to create communication template: ${error.message}`);
    }
  }
);

/**
 * Actualizar template de comunicación (solo admin)
 */
export const updateCommunicationTemplate = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can update communication templates');
      }

      const { templateId, updates } = request.data;

      if (!templateId || !updates) {
        throw new HttpsError('invalid-argument', 'Template ID and updates are required');
      }

      await db.collection('communication_templates').doc(templateId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating communication template:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update communication template: ${error.message}`);
    }
  }
);

/**
 * Eliminar template de comunicación (solo admin)
 */
export const deleteCommunicationTemplate = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can delete communication templates');
      }

      const { templateId } = request.data;

      if (!templateId) {
        throw new HttpsError('invalid-argument', 'Template ID is required');
      }

      await db.collection('communication_templates').doc(templateId).delete();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting communication template:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to delete communication template: ${error.message}`);
    }
  }
);

/**
 * Procesar template con variables
 */
export const processTemplate = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { templateId, variables } = request.data;

      if (!templateId || !variables) {
        throw new HttpsError('invalid-argument', 'Template ID and variables are required');
      }

      const templateDoc = await db.collection('communication_templates').doc(templateId).get();

      if (!templateDoc.exists) {
        throw new HttpsError('not-found', 'Template not found');
      }

      const templateData = templateDoc.data();
      let processedSubject = templateData?.subject || '';
      let processedBody = templateData?.body || '';

      // Reemplazar variables en subject y body
      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedSubject = processedSubject.replace(regex, variables[key]);
        processedBody = processedBody.replace(regex, variables[key]);
      });

      return {
        subject: processedSubject,
        body: processedBody,
      };
    } catch (error: any) {
      console.error('Error processing template:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to process template: ${error.message}`);
    }
  }
);



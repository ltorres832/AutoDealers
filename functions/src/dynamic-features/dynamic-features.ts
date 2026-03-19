// Cloud Functions para Dynamic Features (Features activables dinámicamente por tenant)

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener features dinámicas de un tenant
 */
export const getDynamicFeatures = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId } = request.data;

      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'Tenant ID is required');
      }

      // Obtener features dinámicas del tenant
      const featuresDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('dynamic_features')
        .get();

      if (!featuresDoc.exists) {
        // Features por defecto basadas en membresía
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();
        const membershipId = tenantData?.membershipId;

        let defaultFeatures: Record<string, boolean> = {};

        if (membershipId) {
          const membershipDoc = await db.collection('memberships').doc(membershipId).get();
          const membershipData = membershipDoc.data();
          const features = membershipData?.features || {};

          defaultFeatures = {
            crm: true,
            inventory: true,
            messaging: features.messagingEnabled || false,
            appointments: true,
            sales: true,
            reports: features.advancedReports || false,
            ai: features.aiEnabled || false,
            socialMedia: features.socialMediaEnabled || false,
            workflows: features.workflowsEnabled || false,
            tasks: true,
            contracts: features.contractsEnabled || false,
            reviews: true,
            referrals: true,
            banners: features.bannersEnabled || false,
            promotions: features.promotionsEnabled || false,
            fi: features.fiEnabled || false,
            customerFiles: true,
            reminders: true,
            internalChat: true,
            publicChat: true,
          };
        } else {
          // Features básicas si no hay membresía
          defaultFeatures = {
            crm: true,
            inventory: true,
            messaging: false,
            appointments: true,
            sales: true,
            reports: false,
            ai: false,
            socialMedia: false,
            workflows: false,
            tasks: true,
            contracts: false,
            reviews: true,
            referrals: false,
            banners: false,
            promotions: false,
            fi: false,
            customerFiles: true,
            reminders: true,
            internalChat: true,
            publicChat: true,
          };
        }

        // Guardar features por defecto
        await db
          .collection('tenants')
          .doc(tenantId)
          .collection('settings')
          .doc('dynamic_features')
          .set({
            features: defaultFeatures,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        return { features: defaultFeatures };
      }

      const featuresData = featuresDoc.data();
      return { features: featuresData?.features || {} };
    } catch (error: any) {
      console.error('Error getting dynamic features:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get dynamic features: ${error.message}`);
    }
  }
);

/**
 * Actualizar features dinámicas (solo admin o tenant owner)
 */
export const updateDynamicFeatures = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, features } = request.data;

      if (!tenantId || !features) {
        throw new HttpsError('invalid-argument', 'Tenant ID and features are required');
      }

      // Verificar permisos
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();

      if (userData?.role !== 'admin' && userData?.tenantId !== tenantId) {
        throw new HttpsError('permission-denied', 'Only admins or tenant owners can update dynamic features');
      }

      // Actualizar features
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('dynamic_features')
        .set({
          features,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

      return { success: true, message: 'Dynamic features updated successfully' };
    } catch (error: any) {
      console.error('Error updating dynamic features:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update dynamic features: ${error.message}`);
    }
  }
);

/**
 * Verificar si una feature está habilitada para un tenant
 */
export const checkDynamicFeature = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { tenantId, featureKey } = request.data;

      if (!tenantId || !featureKey) {
        throw new HttpsError('invalid-argument', 'Tenant ID and feature key are required');
      }

      const featuresDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('dynamic_features')
        .get();

      if (!featuresDoc.exists) {
        // Por defecto, retornar false si no existe configuración
        return { enabled: false };
      }

      const featuresData = featuresDoc.data();
      const features = featuresData?.features || {};

      return { enabled: features[featureKey] === true };
    } catch (error: any) {
      console.error('Error checking dynamic feature:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to check dynamic feature: ${error.message}`);
    }
  }
);



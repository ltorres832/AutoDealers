// Cloud Functions para Feature Flags

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

type DashboardType = 'admin' | 'dealer' | 'seller' | 'public';

/**
 * Obtener feature flags de un dashboard
 */
export const getFeatureFlags = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { dashboard } = request.data;

      if (!dashboard) {
        throw new HttpsError('invalid-argument', 'Dashboard is required');
      }

      const snapshot = await db
        .collection('feature_flags')
        .where('dashboard', '==', dashboard)
        .get();

      const features = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date(),
          updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
      });

      return { features };
    } catch (error: any) {
      console.error('Error getting feature flags:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get feature flags: ${error.message}`);
    }
  }
);

/**
 * Verificar si una feature está habilitada
 */
export const checkFeatureFlag = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { dashboard, featureKey } = request.data;

      if (!dashboard || !featureKey) {
        throw new HttpsError('invalid-argument', 'Dashboard and feature key are required');
      }

      const snapshot = await db
        .collection('feature_flags')
        .where('dashboard', '==', dashboard)
        .where('featureKey', '==', featureKey)
        .limit(1)
        .get();

      if (snapshot.empty) {
        // Por defecto, si no existe configuración, la feature está habilitada
        return { enabled: true };
      }

      const config = snapshot.docs[0].data();
      return { enabled: config.enabled !== false };
    } catch (error: any) {
      console.error('Error checking feature flag:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to check feature flag: ${error.message}`);
    }
  }
);

/**
 * Actualizar feature flag (solo admin)
 */
export const updateFeatureFlag = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can update feature flags');
      }

      const { dashboard, featureKey, enabled, featureName, description, category } = request.data;

      if (!dashboard || !featureKey || enabled === undefined) {
        throw new HttpsError('invalid-argument', 'Dashboard, feature key and enabled are required');
      }

      const snapshot = await db
        .collection('feature_flags')
        .where('dashboard', '==', dashboard)
        .where('featureKey', '==', featureKey)
        .limit(1)
        .get();

      if (snapshot.empty) {
        // Crear nueva configuración
        const newConfigRef = db.collection('feature_flags').doc();
        const newConfig = {
          dashboard,
          featureKey,
          featureName: featureName || featureKey,
          enabled,
          description: description || '',
          category: category || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await newConfigRef.set(newConfig);

        return {
          config: {
            id: newConfigRef.id,
            ...newConfig,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
      } else {
        // Actualizar configuración existente
        const configRef = snapshot.docs[0].ref;
        const updateData: any = {
          enabled,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (featureName) updateData.featureName = featureName;
        if (description) updateData.description = description;
        if (category) updateData.category = category;

        await configRef.update(updateData);

        const updated = await configRef.get();
        const data = updated.data();

        return {
          config: {
            id: updated.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
          },
        };
      }
    } catch (error: any) {
      console.error('Error updating feature flag:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update feature flag: ${error.message}`);
    }
  }
);



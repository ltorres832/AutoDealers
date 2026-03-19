// Cloud Functions para Landing Page Configuration

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener configuración de landing page
 */
export const getLandingConfig = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { tenantId } = request.data;

      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'Tenant ID is required');
      }

      // Obtener configuración de landing del tenant
      const configDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('landing_config')
        .get();

      if (!configDoc.exists) {
        // Configuración por defecto
        const defaultConfig = {
          hero: {
            title: 'Bienvenido a nuestro concesionario',
            subtitle: 'Encuentra el vehículo perfecto para ti',
            backgroundImage: '',
            ctaText: 'Ver Inventario',
            ctaLink: '/inventory',
          },
          sections: {
            featuredVehicles: {
              enabled: true,
              title: 'Vehículos Destacados',
              limit: 6,
            },
            about: {
              enabled: true,
              title: 'Sobre Nosotros',
              content: '',
            },
            services: {
              enabled: true,
              title: 'Nuestros Servicios',
              items: [],
            },
            testimonials: {
              enabled: true,
              title: 'Lo que dicen nuestros clientes',
            },
            contact: {
              enabled: true,
              title: 'Contáctanos',
              formEnabled: true,
            },
          },
          seo: {
            title: '',
            description: '',
            keywords: [],
          },
          customCss: '',
          customJs: '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Guardar configuración por defecto
        await db
          .collection('tenants')
          .doc(tenantId)
          .collection('settings')
          .doc('landing_config')
          .set(defaultConfig);

        return { config: defaultConfig };
      }

      const config = configDoc.data();
      return { config };
    } catch (error: any) {
      console.error('Error getting landing config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get landing config: ${error.message}`);
    }
  }
);

/**
 * Actualizar configuración de landing page
 */
export const updateLandingConfig = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, config } = request.data;

      if (!tenantId || !config) {
        throw new HttpsError('invalid-argument', 'Tenant ID and config are required');
      }

      // Verificar permisos
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      const userData = userDoc.data();

      if (userData?.role !== 'admin' && userData?.tenantId !== tenantId) {
        throw new HttpsError('permission-denied', 'Only admins or tenant owners can update landing config');
      }

      // Actualizar configuración
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('landing_config')
        .set({
          ...config,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

      return { success: true, message: 'Landing configuration updated successfully' };
    } catch (error: any) {
      console.error('Error updating landing config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update landing config: ${error.message}`);
    }
  }
);

/**
 * Obtener configuración pública de landing (sin autenticación)
 */
export const getPublicLandingConfig = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { tenantId } = request.data;

      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'Tenant ID is required');
      }

      // Obtener configuración de landing del tenant
      const configDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('landing_config')
        .get();

      if (!configDoc.exists) {
        // Retornar configuración por defecto mínima
        return {
          config: {
            hero: {
              title: 'Bienvenido a nuestro concesionario',
              subtitle: 'Encuentra el vehículo perfecto para ti',
              backgroundImage: '',
              ctaText: 'Ver Inventario',
              ctaLink: '/inventory',
            },
            sections: {
              featuredVehicles: { enabled: true },
              about: { enabled: true },
              services: { enabled: true },
              testimonials: { enabled: true },
              contact: { enabled: true },
            },
          },
        };
      }

      const config = configDoc.data();
      // Remover campos sensibles como customCss y customJs si es necesario
      const publicConfig = {
        ...config,
        customCss: undefined,
        customJs: undefined,
      };

      return { config: publicConfig };
    } catch (error: any) {
      console.error('Error getting public landing config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get public landing config: ${error.message}`);
    }
  }
);



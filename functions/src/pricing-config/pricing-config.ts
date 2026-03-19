// Cloud Functions para Pricing Config

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener configuración de precios
 */
export const getPricingConfig = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const configDoc = await db.collection('admin_config').doc('pricing').get();
      
      if (!configDoc.exists) {
        // Valores por defecto
        const defaultConfig = {
          promotions: {
            vehicle: {
              durations: [3, 7, 15, 30],
              prices: {
                3: 9.99,
                7: 19.99,
                15: 34.99,
                30: 59.99,
              },
            },
            dealer: {
              durations: [3, 7, 15, 30],
              prices: {
                3: 49.99,
                7: 89.99,
                15: 149.99,
                30: 199.99,
              },
            },
            seller: {
              durations: [3, 7, 15, 30],
              prices: {
                3: 24.99,
                7: 44.99,
                15: 79.99,
                30: 119.99,
              },
            },
          },
          banners: {
            hero: {
              durations: [7, 15, 30],
              prices: {
                7: 199,
                15: 349,
                30: 599,
              },
            },
            sidebar: {
              durations: [7, 15, 30],
              prices: {
                7: 99,
                15: 149,
                30: 299,
              },
            },
            between_content: {
              durations: [7, 15, 30],
              prices: {
                7: 149,
                15: 249,
                30: 449,
              },
            },
            sponsors_section: {
              durations: [7, 15, 30],
              prices: {
                7: 79,
                15: 129,
                30: 229,
              },
            },
          },
          limits: {
            maxActivePromotions: 12,
            maxActiveBanners: 4,
            maxPromotionsPerUser: 5,
            maxBannersPerUser: 2,
            maxPromotionsPerDealer: 10,
            maxPromotionsPerSeller: 3,
            maxBannersPerDealer: 3,
            maxBannersPerSeller: 1,
            minPromotionDuration: 1,
            maxPromotionDuration: 90,
            minBannerDuration: 7,
            maxBannerDuration: 90,
          },
          currency: 'USD',
          taxRate: 0,
          discounts: {
            enabled: false,
            volumeDiscounts: [],
            membershipDiscounts: [],
          },
          restrictions: {
            cooldownBetweenPromotions: 0,
            cooldownBetweenBanners: 0,
            requireApproval: false,
          },
        };

        // Crear configuración por defecto
        await db.collection('admin_config').doc('pricing').set({
          ...defaultConfig,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { config: defaultConfig };
      }

      const config = configDoc.data();
      return { config };
    } catch (error: any) {
      console.error('Error getting pricing config:', error);
      throw new HttpsError('internal', `Failed to get pricing config: ${error.message}`);
    }
  }
);

/**
 * Actualizar configuración de precios (solo admin)
 */
export const updatePricingConfig = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can update pricing config');
      }

      const { config } = request.data;

      if (!config) {
        throw new HttpsError('invalid-argument', 'Config is required');
      }

      // Validar estructura
      if (!config.promotions || !config.banners || !config.limits) {
        throw new HttpsError('invalid-argument', 'Invalid config structure');
      }

      // Actualizar configuración
      await db.collection('admin_config').doc('pricing').set({
        ...config,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return { success: true, message: 'Configuración actualizada exitosamente' };
    } catch (error: any) {
      console.error('Error updating pricing config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update pricing config: ${error.message}`);
    }
  }
);



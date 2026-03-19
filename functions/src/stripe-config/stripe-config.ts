// Cloud Functions para configuración completa de Stripe

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Obtener configuración de Stripe
 */
export const getStripeConfig = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can view Stripe config');
      }

      const configDoc = await db.collection('admin_config').doc('stripe').get();
      
      if (!configDoc.exists) {
        // Configuración por defecto
        const defaultConfig = {
          enabled: false,
          publicKey: '',
          secretKey: '', // No se retorna, solo se guarda
          webhookSecret: '', // No se retorna, solo se guarda
          currency: 'USD',
          taxRate: 0,
          paymentMethods: ['card'],
          subscriptionSettings: {
            trialDays: 0,
            gracePeriodDays: 7,
            cancelAtPeriodEnd: true,
          },
          webhookUrl: '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('admin_config').doc('stripe').set(defaultConfig);

        return {
          config: {
            ...defaultConfig,
            secretKey: '***', // Ocultar clave secreta
            webhookSecret: '***',
          },
        };
      }

      const config = configDoc.data();
      return {
        config: {
          ...config,
          secretKey: '***', // Ocultar clave secreta
          webhookSecret: '***',
        },
      };
    } catch (error: any) {
      console.error('Error getting Stripe config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get Stripe config: ${error.message}`);
    }
  }
);

/**
 * Actualizar configuración de Stripe (solo admin)
 */
export const updateStripeConfig = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can update Stripe config');
      }

      const { config } = request.data;

      if (!config) {
        throw new HttpsError('invalid-argument', 'Config is required');
      }

      // Validar configuración de Stripe si se proporciona
      if (config.secretKey && config.secretKey !== '***') {
        try {
          const testStripe = new Stripe(config.secretKey, {
            apiVersion: '2024-11-20.acacia',
          });
          // Intentar obtener cuenta para validar
          await testStripe.accounts.retrieve();
        } catch (stripeError: any) {
          throw new HttpsError('invalid-argument', `Invalid Stripe secret key: ${stripeError.message}`);
        }
      }

      // Actualizar configuración
      const updateData: any = {
        ...config,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // No actualizar si el valor es '***' (indicando que no se quiere cambiar)
      if (updateData.secretKey === '***') {
        delete updateData.secretKey;
      }
      if (updateData.webhookSecret === '***') {
        delete updateData.webhookSecret;
      }

      await db.collection('admin_config').doc('stripe').set(updateData, { merge: true });

      return { success: true, message: 'Stripe configuration updated successfully' };
    } catch (error: any) {
      console.error('Error updating Stripe config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update Stripe config: ${error.message}`);
    }
  }
);

/**
 * Verificar conexión de Stripe
 */
export const verifyStripeConnection = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can verify Stripe connection');
      }

      const configDoc = await db.collection('admin_config').doc('stripe').get();
      const config = configDoc.data();

      if (!config?.secretKey || config.secretKey === '***') {
        throw new HttpsError('invalid-argument', 'Stripe secret key not configured');
      }

      try {
        const testStripe = new Stripe(config.secretKey, {
          apiVersion: '2024-11-20.acacia',
        });
        const account = await testStripe.accounts.retrieve();
        
        return {
          success: true,
          connected: true,
          account: {
            id: account.id,
            email: account.email,
            country: account.country,
            defaultCurrency: account.default_currency,
          },
        };
      } catch (stripeError: any) {
        return {
          success: false,
          connected: false,
          error: stripeError.message,
        };
      }
    } catch (error: any) {
      console.error('Error verifying Stripe connection:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to verify Stripe connection: ${error.message}`);
    }
  }
);



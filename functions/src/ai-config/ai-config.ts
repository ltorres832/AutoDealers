// Cloud Functions para configuración completa de IA

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener configuración de IA
 */
export const getAIConfig = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can view AI config');
      }

      const configDoc = await db.collection('admin_config').doc('ai').get();
      
      if (!configDoc.exists) {
        // Configuración por defecto
        const defaultConfig = {
          enabled: false,
          provider: 'openai', // 'openai' | 'anthropic'
          openai: {
            apiKey: '', // No se retorna
            model: 'gpt-4-turbo-preview',
            temperature: 0.7,
            maxTokens: 200,
          },
          anthropic: {
            apiKey: '', // No se retorna
            model: 'claude-3-opus-20240229',
            temperature: 0.7,
            maxTokens: 200,
          },
          features: {
            autoResponses: {
              enabled: true,
              requireApproval: true,
              minConfidence: 0.7,
            },
            leadClassification: {
              enabled: true,
              autoUpdate: true,
            },
            sentimentAnalysis: {
              enabled: true,
            },
            contentGeneration: {
              enabled: true,
            },
            reportGeneration: {
              enabled: true,
            },
          },
          tenantConfigs: {}, // Configuraciones específicas por tenant
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('admin_config').doc('ai').set(defaultConfig);

        return {
          config: {
            ...defaultConfig,
            openai: {
              ...defaultConfig.openai,
              apiKey: '***', // Ocultar API key
            },
            anthropic: {
              ...defaultConfig.anthropic,
              apiKey: '***', // Ocultar API key
            },
          },
        };
      }

      const config = configDoc.data();
      return {
        config: {
          ...config,
          openai: {
            ...config.openai,
            apiKey: '***', // Ocultar API key
          },
          anthropic: {
            ...config.anthropic,
            apiKey: '***', // Ocultar API key
          },
        },
      };
    } catch (error: any) {
      console.error('Error getting AI config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get AI config: ${error.message}`);
    }
  }
);

/**
 * Actualizar configuración de IA (solo admin)
 */
export const updateAIConfig = onCall(
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
        throw new HttpsError('permission-denied', 'Only admins can update AI config');
      }

      const { config } = request.data;

      if (!config) {
        throw new HttpsError('invalid-argument', 'Config is required');
      }

      // Actualizar configuración
      const updateData: any = {
        ...config,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // No actualizar si el valor es '***' (indicando que no se quiere cambiar)
      if (updateData.openai?.apiKey === '***') {
        delete updateData.openai.apiKey;
      }
      if (updateData.anthropic?.apiKey === '***') {
        delete updateData.anthropic.apiKey;
      }

      await db.collection('admin_config').doc('ai').set(updateData, { merge: true });

      return { success: true, message: 'AI configuration updated successfully' };
    } catch (error: any) {
      console.error('Error updating AI config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update AI config: ${error.message}`);
    }
  }
);

/**
 * Obtener configuración de IA para un tenant específico
 */
export const getTenantAIConfig = onCall(
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

      // Obtener configuración global
      const globalConfigDoc = await db.collection('admin_config').doc('ai').get();
      const globalConfig = globalConfigDoc.data() || {};

      // Obtener configuración específica del tenant
      const tenantConfig = globalConfig.tenantConfigs?.[tenantId] || {};

      // Combinar configuraciones (tenant override global)
      const mergedConfig = {
        enabled: tenantConfig.enabled !== undefined ? tenantConfig.enabled : globalConfig.enabled || false,
        provider: tenantConfig.provider || globalConfig.provider || 'openai',
        features: {
          autoResponses: {
            ...globalConfig.features?.autoResponses,
            ...tenantConfig.features?.autoResponses,
          },
          leadClassification: {
            ...globalConfig.features?.leadClassification,
            ...tenantConfig.features?.leadClassification,
          },
          sentimentAnalysis: {
            ...globalConfig.features?.sentimentAnalysis,
            ...tenantConfig.features?.sentimentAnalysis,
          },
          contentGeneration: {
            ...globalConfig.features?.contentGeneration,
            ...tenantConfig.features?.contentGeneration,
          },
          reportGeneration: {
            ...globalConfig.features?.reportGeneration,
            ...tenantConfig.features?.reportGeneration,
          },
        },
      };

      return { config: mergedConfig };
    } catch (error: any) {
      console.error('Error getting tenant AI config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get tenant AI config: ${error.message}`);
    }
  }
);

/**
 * Actualizar configuración de IA para un tenant específico
 */
export const updateTenantAIConfig = onCall(
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

      // Obtener configuración global
      const globalConfigDoc = await db.collection('admin_config').doc('ai').get();
      const globalConfig = globalConfigDoc.data() || {};

      // Actualizar configuración específica del tenant
      const tenantConfigs = globalConfig.tenantConfigs || {};
      tenantConfigs[tenantId] = {
        ...tenantConfigs[tenantId],
        ...config,
      };

      await db.collection('admin_config').doc('ai').update({
        tenantConfigs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: 'Tenant AI configuration updated successfully' };
    } catch (error: any) {
      console.error('Error updating tenant AI config:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update tenant AI config: ${error.message}`);
    }
  }
);



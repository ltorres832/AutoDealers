// Gestión de configuración de IA por tenant

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface AIConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'none';
  apiKey?: string; // Encriptado
  model?: string;
  autoClassifyLeads: boolean;
  autoRespondMessages: boolean;
  autoSuggestFollowUps: boolean;
  autoGenerateContent: boolean;
  classificationSettings: {
    enabled: boolean;
    model?: string;
    temperature?: number;
    customPrompt?: string;
  };
  responseSettings: {
    enabled: boolean;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    customSystemPrompt?: string;
    requireApproval?: boolean;
    minConfidence?: number;
  };
  contentSettings: {
    enabled: boolean;
    model?: string;
    temperature?: number;
    style?: string;
  };
  advancedSettings: {
    sentimentAnalysis: boolean;
    intentDetection: boolean;
    leadScoring: boolean;
    conversationSummarization: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  provider: 'none',
  autoClassifyLeads: false,
  autoRespondMessages: false,
  autoSuggestFollowUps: false,
  autoGenerateContent: false,
  classificationSettings: {
    enabled: false,
    model: 'gpt-4-turbo-preview',
    temperature: 0.3,
  },
  responseSettings: {
    enabled: false,
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 200,
    requireApproval: true,
    minConfidence: 0.7,
  },
  contentSettings: {
    enabled: false,
    model: 'gpt-4-turbo-preview',
    temperature: 0.8,
    style: 'professional',
  },
  advancedSettings: {
    sentimentAnalysis: false,
    intentDetection: false,
    leadScoring: false,
    conversationSummarization: false,
  },
};

/**
 * Obtiene la configuración de IA de un tenant
 */
export async function getAIConfig(tenantId: string): Promise<AIConfig> {
  try {
    const configDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('settings')
      .doc('ai')
      .get();

    if (!configDoc.exists) {
      return DEFAULT_AI_CONFIG;
    }

    const data = configDoc.data();
    return {
      ...DEFAULT_AI_CONFIG,
      ...data,
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
    } as AIConfig;
  } catch (error) {
    console.error('Error obteniendo configuración de IA:', error);
    return DEFAULT_AI_CONFIG;
  }
}

/**
 * Actualiza la configuración de IA de un tenant
 */
export async function updateAIConfig(
  tenantId: string,
  updates: Partial<AIConfig>
): Promise<void> {
  try {
    const configRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('settings')
      .doc('ai');

    await configRef.set(
      {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error actualizando configuración de IA:', error);
    throw error;
  }
}

/**
 * Obtiene la API key de IA de un tenant (desencriptada)
 */
export async function getAIApiKey(tenantId: string): Promise<string | null> {
  try {
    const config = await getAIConfig(tenantId);
    
    if (!config.enabled || !config.apiKey) {
      return null;
    }

    // TODO: Desencriptar la API key
    // Por ahora retornamos directamente (en producción debe estar encriptada)
    return config.apiKey;
  } catch (error) {
    console.error('Error obteniendo API key de IA:', error);
    return null;
  }
}

/**
 * Verifica si la IA está habilitada para un tenant
 */
export async function isAIEnabled(tenantId: string): Promise<boolean> {
  const config = await getAIConfig(tenantId);
  return config.enabled && config.provider !== 'none' && !!config.apiKey;
}

/**
 * Obtiene el modelo de IA configurado para un tenant
 */
export async function getAIModel(
  tenantId: string,
  type: 'classification' | 'response' | 'content' = 'classification'
): Promise<string> {
  const config = await getAIConfig(tenantId);
  
  switch (type) {
    case 'classification':
      return config.classificationSettings.model || 'gpt-4-turbo-preview';
    case 'response':
      return config.responseSettings.model || 'gpt-4-turbo-preview';
    case 'content':
      return config.contentSettings.model || 'gpt-4-turbo-preview';
    default:
      return config.model || 'gpt-4-turbo-preview';
  }
}

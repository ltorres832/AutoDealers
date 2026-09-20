// Gestión de configuración de IA por tenant

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { getOpenAIApiKey } from './credentials';

const db = getFirestore();

export interface AIConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'none';
  apiKey?: string; // Encriptado
  model?: string;
  autoClassifyLeads: boolean;
  autoRespondMessages: boolean;
  autoRespondEmails: boolean;
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
  autoRespondEmails: false,
  autoSuggestFollowUps: false,
  autoGenerateContent: false,
  classificationSettings: {
    enabled: false,
    model: 'gpt-4o-mini',
    temperature: 0.3,
  },
  responseSettings: {
    enabled: false,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 200,
    requireApproval: true,
    minConfidence: 0.7,
  },
  contentSettings: {
    enabled: false,
    model: 'gpt-4o-mini',
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

function normalizeDashboardAIConfig(data: Record<string, any> | undefined): Partial<AIConfig> {
  if (!data) return {};

  const autoResponseChannels = Array.isArray(data.autoResponses?.channels)
    ? data.autoResponses.channels
    : [];

  return {
    enabled: data.enabled === true,
    provider: data.provider || (data.enabled === true ? 'openai' : undefined),
    autoClassifyLeads:
      data.leadClassification?.autoClassify === true ||
      data.leadClassification?.enabled === true,
    classificationSettings: {
      ...DEFAULT_AI_CONFIG.classificationSettings,
      enabled:
        data.leadClassification?.enabled === true ||
        data.leadClassification?.autoClassify === true,
    },
    autoRespondMessages:
      data.autoResponses?.enabled === true &&
      (autoResponseChannels.length === 0 ||
        autoResponseChannels.includes('messages') ||
        autoResponseChannels.includes('whatsapp') ||
        autoResponseChannels.includes('facebook') ||
        autoResponseChannels.includes('instagram')),
    autoRespondEmails:
      data.autoResponses?.enabled === true &&
      (autoResponseChannels.length === 0 || autoResponseChannels.includes('email')),
    autoSuggestFollowUps: data.autoFollowups?.enabled === true,
    autoGenerateContent:
      data.socialContent?.enabled === true || data.emailGeneration?.enabled === true,
    responseSettings: {
      ...DEFAULT_AI_CONFIG.responseSettings,
      enabled:
        data.autoResponses?.enabled === true ||
        data.responseSuggestions?.enabled === true,
      requireApproval:
        data.autoResponses?.requireApproval ??
        DEFAULT_AI_CONFIG.responseSettings.requireApproval,
      minConfidence:
        data.autoResponses?.minConfidence ??
        DEFAULT_AI_CONFIG.responseSettings.minConfidence,
    },
    contentSettings: {
      ...DEFAULT_AI_CONFIG.contentSettings,
      enabled: data.socialContent?.enabled === true || data.emailGeneration?.enabled === true,
    },
    advancedSettings: {
      ...DEFAULT_AI_CONFIG.advancedSettings,
      sentimentAnalysis:
        data.leadClassification?.detectSentiment === true ||
        data.advancedSentiment?.enabled === true,
      leadScoring: data.leadClassification?.assignPriority === true,
      conversationSummarization: data.analytics?.enabled === true,
    },
  };
}

/**
 * Obtiene la configuración de IA de un tenant
 */
export async function getAIConfig(tenantId: string): Promise<AIConfig> {
  try {
    const settingsRef = db.collection('tenants').doc(tenantId).collection('settings');
    const [legacyDoc, dashboardDoc] = await Promise.all([
      settingsRef.doc('ai').get(),
      settingsRef.doc('ai_config').get(),
    ]);

    if (!legacyDoc.exists && !dashboardDoc.exists) {
      return DEFAULT_AI_CONFIG;
    }

    const legacyData = legacyDoc.data();
    const dashboardData = dashboardDoc.data();
    const normalizedDashboard = normalizeDashboardAIConfig(dashboardData);
    return {
      ...DEFAULT_AI_CONFIG,
      ...normalizedDashboard,
      ...legacyData,
      createdAt: legacyData?.createdAt?.toDate?.() || dashboardData?.createdAt?.toDate?.(),
      updatedAt: legacyData?.updatedAt?.toDate?.() || dashboardData?.updatedAt?.toDate?.(),
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

    if (!config.enabled) {
      return null;
    }

    return config.apiKey || (await getOpenAIApiKey()) || null;
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
  if (!config.enabled || config.provider === 'none') {
    return false;
  }
  return Boolean(config.apiKey || (await getOpenAIApiKey()));
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
      return config.classificationSettings.model || 'gpt-4o-mini';
    case 'response':
      return config.responseSettings.model || 'gpt-4o-mini';
    case 'content':
      return config.contentSettings.model || 'gpt-4o-mini';
    default:
      return config.model || 'gpt-4o-mini';
  }
}

/**
 * Verifica si la IA puede responder automáticamente para un canal específico
 */
export async function canAutoRespond(
  tenantId: string,
  channel: 'emails' | 'messages'
): Promise<boolean> {
  const config = await getAIConfig(tenantId);
  
  if (!config.enabled || !config.responseSettings.enabled) {
    return false;
  }
  
  if (channel === 'emails') {
    return config.autoRespondEmails || false;
  } else {
    return config.autoRespondMessages || false;
  }
}

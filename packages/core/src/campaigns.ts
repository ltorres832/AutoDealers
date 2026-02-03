// Sistema de campañas de publicidad

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';

export type CampaignPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'tiktok';

export interface CampaignBudget {
  platform: CampaignPlatform;
  amount: number;
  currency: string;
  dailyLimit?: number;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  engagements: number;
  leads: number;
  conversions: number;
  spend: number;
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  cpl: number; // Cost per lead
}

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'promotion' | 'awareness' | 'conversion' | 'engagement';
  platforms: CampaignPlatform[];
  budgets: CampaignBudget[];
  content: {
    text: string;
    images?: string[];
    videos?: string[];
    callToAction?: string;
    link?: string;
  };
  targeting?: {
    ageRange?: { min: number; max: number };
    genders?: string[];
    locations?: string[];
    interests?: string[];
  };
  schedule?: {
    startDate: Date;
    endDate?: Date;
    times?: string[]; // Horarios específicos
  };
  status: CampaignStatus;
  aiGenerated: boolean;
  metrics?: CampaignMetrics;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Crea una nueva campaña
 */
export async function createCampaign(
  campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Campaign> {
  const docRef = getDb()
    .collection('tenants')
    .doc(campaign.tenantId)
    .collection('campaigns')
    .doc();

  await docRef.set({
    ...campaign,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...campaign,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene campañas de un tenant
 */
export async function getCampaigns(
  tenantId: string,
  filters?: {
    status?: CampaignStatus;
    platform?: CampaignPlatform;
    limit?: number;
  }
): Promise<Campaign[]> {
  let query: admin.firestore.Query = getDb().collection('tenants')
    .doc(tenantId)
    .collection('campaigns');

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  query = query.orderBy('createdAt', 'desc');

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();

  let campaigns = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      schedule: data.schedule
        ? {
            ...data.schedule,
            startDate: data.schedule.startDate?.toDate(),
            endDate: data.schedule.endDate?.toDate(),
          }
        : undefined,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      startedAt: data?.startedAt?.toDate(),
      completedAt: data?.completedAt?.toDate(),
    } as Campaign;
  });

  // Filtrar por plataforma si se especifica
  if (filters?.platform) {
    campaigns = campaigns.filter((c) =>
      c.platforms.includes(filters.platform!)
    );
  }

  return campaigns;
}

/**
 * Actualiza una campaña
 */
export async function updateCampaign(
  tenantId: string,
  campaignId: string,
  updates: Partial<Campaign>
): Promise<void> {
  await getDb().collection('tenants')
    .doc(tenantId)
    .collection('campaigns')
    .doc(campaignId)
    .update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

/**
 * Actualiza métricas de una campaña
 */
export async function updateCampaignMetrics(
  tenantId: string,
  campaignId: string,
  metrics: Partial<CampaignMetrics>
): Promise<void> {
  const campaignDoc = await getDb().collection('tenants')
    .doc(tenantId)
    .collection('campaigns')
    .doc(campaignId)
    .get();

  if (!campaignDoc.exists) {
    throw new Error('Campaign not found');
  }

  const currentMetrics = campaignDoc.data()?.metrics || {};
  const updatedMetrics = {
    ...currentMetrics,
    ...metrics,
    // Calcular métricas derivadas
    ctr:
      metrics.clicks && metrics.impressions
        ? (metrics.clicks / metrics.impressions) * 100
        : currentMetrics.ctr,
    cpc:
      metrics.clicks && metrics.spend
        ? metrics.spend / metrics.clicks
        : currentMetrics.cpc,
    cpl:
      metrics.leads && metrics.spend
        ? metrics.spend / metrics.leads
        : currentMetrics.cpl,
  };

  await getDb().collection('tenants')
    .doc(tenantId)
    .collection('campaigns')
    .doc(campaignId)
    .update({
      metrics: updatedMetrics,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

/**
 * Inicia una campaña
 */
export async function startCampaign(
  tenantId: string,
  campaignId: string
): Promise<void> {
  await updateCampaign(tenantId, campaignId, {
    status: 'active',
    startedAt: new Date(),
  });
}

/**
 * Pausa una campaña
 */
export async function pauseCampaign(
  tenantId: string,
  campaignId: string
): Promise<void> {
  await updateCampaign(tenantId, campaignId, {
    status: 'paused',
  });
}






// Sistema de ads pagados para Facebook e Instagram

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

const db = getFirestore();

export type AdObjective = 'more_messages' | 'more_visits' | 'more_engagement';

export interface AdCampaign {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  objective: AdObjective;
  vehicleId?: string;
  profileId?: string; // Para promociones de perfil
  budget: number; // Presupuesto total
  dailyBudget?: number; // Presupuesto diario
  duration: number; // Días
  platforms: ('facebook' | 'instagram')[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  adSetId?: string; // ID del ad set en Meta
  adId?: string; // ID del ad en Meta
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  spent: number;
  impressions: number;
  clicks: number;
  messages: number;
  visits: number;
}

/**
 * Crea una campaña de ads
 */
export async function createAdCampaign(
  campaign: Omit<AdCampaign, 'id' | 'createdAt' | 'spent' | 'impressions' | 'clicks' | 'messages' | 'visits'>
): Promise<AdCampaign> {
  const docRef = db
    .collection('tenants')
    .doc(campaign.tenantId)
    .collection('ad_campaigns')
    .doc();

  const campaignData = {
    ...campaign,
    status: 'draft' as const,
    spent: 0,
    impressions: 0,
    clicks: 0,
    messages: 0,
    visits: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.set(campaignData as any);

  return {
    id: docRef.id,
    ...campaign,
    status: 'draft',
    spent: 0,
    impressions: 0,
    clicks: 0,
    messages: 0,
    visits: 0,
    createdAt: new Date(),
  };
}

/**
 * Inicia una campaña de ads en Meta
 */
export async function startAdCampaign(
  tenantId: string,
  campaignId: string
): Promise<{ success: boolean; adSetId?: string; adId?: string; error?: string }> {
  try {
    // Obtener la campaña
    const campaignDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('ad_campaigns')
      .doc(campaignId)
      .get();

    if (!campaignDoc.exists) {
      return { success: false, error: 'Campaña no encontrada' };
    }

    const campaign = campaignDoc.data() as AdCampaign;

    // Obtener integración de Facebook
    const integrationSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .where('type', '==', 'facebook')
      .where('status', '==', 'active')
      .get();

    if (integrationSnapshot.empty) {
      return { success: false, error: 'Facebook no está conectado' };
    }

    const integration = integrationSnapshot.docs[0].data();
    const accessToken = integration.credentials?.accessToken;
    const adAccountId = integration.credentials?.adAccountId;

    if (!accessToken || !adAccountId) {
      return { success: false, error: 'Credenciales de ads no configuradas' };
    }

    // Crear ad set en Meta
    const dailyBudget = campaign.dailyBudget || (campaign.budget / campaign.duration);
    const adSetResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/adsets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaign.name,
          campaign_id: adAccountId, // Necesitarías crear una campaña primero
          daily_budget: Math.round(dailyBudget * 100), // En centavos
          billing_event: 'IMPRESSIONS',
          optimization_goal: campaign.objective === 'more_messages' ? 'MESSAGES' : 'LINK_CLICKS',
          targeting: {
            age_min: 18,
            age_max: 65,
            genders: [1, 2], // Ambos géneros
            geo_locations: {
              countries: ['MX'], // México por defecto
            },
          },
          status: 'PAUSED', // Empezar pausado hasta que el ad esté listo
        }),
      }
    );

    const adSetData = await adSetResponse.json();

    if (!adSetResponse.ok) {
      return { success: false, error: adSetData.error?.message || 'Error al crear ad set' };
    }

    // Actualizar campaña con ad set ID
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('ad_campaigns')
      .doc(campaignId)
      .update({
        adSetId: adSetData.id,
        status: 'active',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);

    return {
      success: true,
      adSetId: adSetData.id,
    };
  } catch (error) {
    console.error('Error starting ad campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Pausa una campaña de ads
 */
export async function pauseAdCampaign(
  tenantId: string,
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const campaignDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('ad_campaigns')
      .doc(campaignId)
      .get();

    if (!campaignDoc.exists) {
      return { success: false, error: 'Campaña no encontrada' };
    }

    const campaign = campaignDoc.data() as AdCampaign;

    if (campaign.adSetId) {
      // Pausar en Meta
      const integrationSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .where('type', '==', 'facebook')
        .where('status', '==', 'active')
        .get();

      if (!integrationSnapshot.empty) {
        const integration = integrationSnapshot.docs[0].data();
        const accessToken = integration.credentials?.accessToken;

        await fetch(
          `https://graph.facebook.com/v18.0/${campaign.adSetId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'PAUSED',
            }),
          }
        );
      }
    }

    // Actualizar en Firestore
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('ad_campaigns')
      .doc(campaignId)
      .update({
        status: 'paused',
      } as any);

    return { success: true };
  } catch (error) {
    console.error('Error pausing ad campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene campañas de ads de un tenant
 */
export async function getAdCampaigns(
  tenantId: string,
  userId?: string
): Promise<AdCampaign[]> {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('ad_campaigns');

  if (userId) {
    query = query.where('userId', '==', userId);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      startedAt: data.startedAt?.toDate(),
      endedAt: data.endedAt?.toDate(),
    } as AdCampaign;
  });
}


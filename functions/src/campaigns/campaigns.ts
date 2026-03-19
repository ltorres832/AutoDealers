// Cloud Functions para Campaigns

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Obtener campañas
 */
export const getCampaigns = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, status, platform, limit } = request.data;

      if (!tenantId) {
        throw new HttpsError('invalid-argument', 'Tenant ID is required');
      }

      let query: admin.firestore.Query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('campaigns');

      if (status) {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('createdAt', 'desc');

      if (limit) {
        query = query.limit(limit);
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
        };
      });

      // Filtrar por plataforma si se especifica
      if (platform) {
        campaigns = campaigns.filter((c) =>
          c.platforms?.includes(platform)
        );
      }

      return { campaigns };
    } catch (error: any) {
      console.error('Error getting campaigns:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to get campaigns: ${error.message}`);
    }
  }
);

/**
 * Crear campaña
 */
export const createCampaign = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, name, description, type, platforms, budgets, content, schedule, status, aiGenerated } = request.data;

      if (!tenantId || !name || !type || !platforms || !content) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
      }

      const campaignRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('campaigns')
        .doc();

      const campaignData = {
        tenantId,
        name,
        description: description || '',
        type,
        platforms,
        budgets: budgets || [],
        content,
        targeting: request.data.targeting || {},
        schedule: schedule ? {
          startDate: admin.firestore.Timestamp.fromDate(new Date(schedule.startDate)),
          endDate: schedule.endDate ? admin.firestore.Timestamp.fromDate(new Date(schedule.endDate)) : null,
          times: schedule.times || [],
        } : null,
        status: status || 'draft',
        aiGenerated: aiGenerated || false,
        metrics: {
          impressions: 0,
          clicks: 0,
          engagements: 0,
          leads: 0,
          conversions: 0,
          spend: 0,
          ctr: 0,
          cpc: 0,
          cpl: 0,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await campaignRef.set(campaignData);

      return {
        campaign: {
          id: campaignRef.id,
          ...campaignData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to create campaign: ${error.message}`);
    }
  }
);

/**
 * Actualizar campaña
 */
export const updateCampaign = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, campaignId, updates } = request.data;

      if (!tenantId || !campaignId || !updates) {
        throw new HttpsError('invalid-argument', 'Tenant ID, Campaign ID and updates are required');
      }

      const campaignRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('campaigns')
        .doc(campaignId);

      const updateData: any = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (updates.schedule) {
        updateData.schedule = {
          startDate: admin.firestore.Timestamp.fromDate(new Date(updates.schedule.startDate)),
          endDate: updates.schedule.endDate ? admin.firestore.Timestamp.fromDate(new Date(updates.schedule.endDate)) : null,
          times: updates.schedule.times || [],
        };
      }

      await campaignRef.update(updateData);

      const updatedDoc = await campaignRef.get();
      const data = updatedDoc.data();

      return {
        campaign: {
          id: updatedDoc.id,
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date(),
          updatedAt: data?.updatedAt?.toDate() || new Date(),
        },
      };
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to update campaign: ${error.message}`);
    }
  }
);

/**
 * Eliminar campaña
 */
export const deleteCampaign = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { tenantId, campaignId } = request.data;

      if (!tenantId || !campaignId) {
        throw new HttpsError('invalid-argument', 'Tenant ID and Campaign ID are required');
      }

      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('campaigns')
        .doc(campaignId)
        .delete();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to delete campaign: ${error.message}`);
    }
  }
);



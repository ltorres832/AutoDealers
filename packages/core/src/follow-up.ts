// Sistema de seguimiento de clientes sin compra

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import { getLeads } from '@autodealers/crm';
import { getActivePromotions } from './promotions';
import { UnifiedMessagingService } from '@autodealers/messaging';
import { AIAssistant } from '@autodealers/ai';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface FollowUpCampaign {
  id: string;
  tenantId: string;
  name: string;
  targetLeads: {
    status: string[]; // Estados de leads a incluir
    daysSinceLastContact: number; // Días desde último contacto
  };
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  usePromotions: boolean;
  customMessage?: string;
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea una campaña de seguimiento
 */
export async function createFollowUpCampaign(
  campaign: Omit<FollowUpCampaign, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FollowUpCampaign> {
  const docRef = getDb().collection('tenants')
    .doc(campaign.tenantId)
    .collection('follow_up_campaigns')
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
 * Ejecuta campañas de seguimiento pendientes
 */
export async function runFollowUpCampaigns(): Promise<void> {
  const now = new Date();

  // Obtener todas las campañas activas que deben ejecutarse
  const tenantsSnapshot = await getDb().collection('tenants').get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;

    const campaignsSnapshot = await getDb().collection('tenants')
      .doc(tenantId)
      .collection('follow_up_campaigns')
      .where('isActive', '==', true)
      .where('nextRun', '<=', now)
      .get();

    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaign = campaignDoc.data() as FollowUpCampaign;

      try {
        await executeFollowUpCampaign(tenantId, campaign);

        // Calcular próxima ejecución
        const nextRun = calculateNextRun(campaign.frequency, now);
        await campaignDoc.ref.update({
          lastRun: admin.firestore.FieldValue.serverTimestamp(),
          nextRun,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);
      } catch (error) {
        console.error(`Error executing campaign ${campaign.id}:`, error);
      }
    }
  }
}

/**
 * Ejecuta una campaña de seguimiento
 */
async function executeFollowUpCampaign(
  tenantId: string,
  campaign: FollowUpCampaign
): Promise<void> {
  // Obtener leads objetivo
  const allLeads = await getLeads(tenantId);
  const targetLeads = allLeads.filter((lead) => {
    // Filtrar por estado
    if (!campaign.targetLeads.status.includes(lead.status)) {
      return false;
    }

    // Filtrar por días desde último contacto
    const lastInteraction = lead.interactions[lead.interactions.length - 1];
    if (lastInteraction) {
      const daysSince = Math.floor(
        (Date.now() - lastInteraction.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < campaign.targetLeads.daysSinceLastContact) {
        return false;
      }
    }

    return true;
  });

  // Obtener promociones activas si se usan
  let promotions: any[] = [];
  if (campaign.usePromotions) {
    promotions = await getActivePromotions(tenantId);
  }

  const unifiedService = new UnifiedMessagingService();
  const { getOpenAIApiKey } = await import('./credentials');
  const apiKey = await getOpenAIApiKey() || '';
  const aiAssistant = new AIAssistant(apiKey);

  for (const lead of targetLeads) {
    try {
      // Generar mensaje personalizado
      let messageContent = campaign.customMessage || '';

      if (promotions.length > 0) {
        const promotion = promotions[0]; // Usar primera promoción activa
        const promotionText = `Tenemos una promoción especial: ${promotion.name}. ${promotion.description}`;
        messageContent = messageContent
          ? `${messageContent}\n\n${promotionText}`
          : promotionText;
      }

      // Mejorar mensaje con IA si está vacío
      if (!messageContent) {
        const aiResponse = await aiAssistant.generateResponse(
          `Genera un mensaje de seguimiento amigable para ${lead.contact.name} que no ha realizado una compra aún.`,
          'Crea un mensaje que invite a ver nuestro inventario y ofrezca ayuda.',
          []
        );
        messageContent = aiResponse.content;
      }

      // Enviar mensaje
      await unifiedService.sendMessage({
        tenantId,
        leadId: lead.id,
        channel: lead.contact.preferredChannel as any || 'whatsapp',
        direction: 'outbound',
        from: '', // Se obtiene de configuración
        to: lead.contact.phone || lead.contact.email || '',
        content: messageContent,
        metadata: {
          followUpCampaignId: campaign.id,
          aiGenerated: !campaign.customMessage,
        },
      });

      // Agregar interacción al lead
      const { addInteraction } = await import('@autodealers/crm');
      await addInteraction(tenantId, lead.id, {
        type: 'message',
        content: `Seguimiento automático: ${messageContent}`,
        userId: 'system',
      });
    } catch (error) {
      console.error(`Error sending follow-up to lead ${lead.id}:`, error);
    }
  }
}

/**
 * Calcula próxima fecha de ejecución
 */
function calculateNextRun(frequency: string, from: Date): Date {
  const next = new Date(from);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next;
}




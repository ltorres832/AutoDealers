// Webhook de WhatsApp Business API — alineado con apps/admin (CRM + dueño + verify)

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import {
  createLead,
  findLeadByPhone,
  findLeadByPhoneInTenant,
  updateLead,
  addInteraction,
  assignLead,
} from '@autodealers/crm';
import {
  createNotification,
  resolveMetaWebhookVerifyToken,
  getTenantByWhatsAppNumber,
  getWhatsAppAccessToken,
  getWhatsAppPhoneNumberId,
} from '@autodealers/core';
import { WhatsAppService } from '@autodealers/messaging';
import { UnifiedMessagingService } from '@autodealers/messaging';
import { publicWebhookHttpsOptions } from './public-http';

const db = getFirestore();

export const whatsappWebhookGet = onRequest(publicWebhookHttpsOptions, async (req, res) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;
  const verifyToken = await resolveMetaWebhookVerifyToken();
  if (mode === 'subscribe' && token === verifyToken) {
    res.set('Content-Type', 'text/plain');
    res.status(200).send(challenge || '');
    return;
  }
  res.status(403).json({ error: 'Invalid token' });
});

export const whatsappWebhookPost = onRequest(publicWebhookHttpsOptions, async (req, res) => {
  try {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'] as string;
      const token = req.query['hub.verify_token'] as string;
      const challenge = req.query['hub.challenge'] as string;
      const verifyToken = await resolveMetaWebhookVerifyToken();
      if (mode === 'subscribe' && token === verifyToken) {
        res.set('Content-Type', 'text/plain');
        res.status(200).send(challenge || '');
        return;
      }
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    const body = req.body;
    const phoneNumberId =
      body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || '';

    let tenantId = await getTenantByWhatsAppNumber(phoneNumberId || '');

    const integrationsSnapshot = await db
      .collectionGroup('integrations')
      .where('type', '==', 'whatsapp')
      .where('phoneNumberId', '==', phoneNumberId)
      .limit(1)
      .get();

    let leadOwnerUserId: string | undefined;
    let accessToken: string | undefined;
    let tenantPhoneNumberId: string | undefined;

    if (!integrationsSnapshot.empty) {
      const intDoc = integrationsSnapshot.docs[0];
      const integrationData = intDoc.data();
      if (!tenantId) {
        tenantId =
          (typeof integrationData.tenantId === 'string' && integrationData.tenantId) ||
          intDoc.ref.parent.parent?.id ||
          null;
      }
      const cred = integrationData.credentials || {};
      accessToken = (integrationData.accessToken ||
        cred.accessToken ||
        cred.longLivedUserToken) as string | undefined;
      tenantPhoneNumberId = (integrationData.phoneNumberId ||
        cred.phoneNumberId ||
        cred.phone_number_id ||
        phoneNumberId) as string | undefined;
      const lo = integrationData.leadOwnerUserId;
      if (typeof lo === 'string' && lo.trim()) {
        leadOwnerUserId = lo.trim();
      }
    }

    if (!tenantId) {
      const tenantsSnapshot = await db
        .collection('tenants')
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (!tenantsSnapshot.empty) {
        tenantId = tenantsSnapshot.docs[0].id;
        console.warn(`⚠️ WhatsApp ${phoneNumberId}: tenant fallback ${tenantId}`);
      } else {
        res.status(200).json({ received: true, error: 'No tenant found' });
        return;
      }
    }

    if (tenantId && (!accessToken || !tenantPhoneNumberId)) {
      const integrationDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .where('type', '==', 'whatsapp')
        .where('status', '==', 'active')
        .limit(10)
        .get();
      const match = integrationDoc.docs.find((d) => {
        const data = d.data();
        const c = data.credentials || {};
        const pid = String(data.phoneNumberId || c.phoneNumberId || c.phone_number_id || '');
        return pid === String(phoneNumberId);
      });
      const doc = match || integrationDoc.docs[0];
      if (doc) {
        const integrationData = doc.data();
        const cred = integrationData.credentials || {};
        accessToken = (integrationData.accessToken ||
          cred.accessToken ||
          cred.longLivedUserToken) as string | undefined;
        tenantPhoneNumberId = (integrationData.phoneNumberId ||
          cred.phoneNumberId ||
          cred.phone_number_id ||
          phoneNumberId) as string | undefined;
        if (!leadOwnerUserId) {
          const lo = integrationData.leadOwnerUserId;
          if (typeof lo === 'string' && lo.trim()) {
            leadOwnerUserId = lo.trim();
          }
        }
      }
    }

    if (!accessToken || !tenantPhoneNumberId) {
      const at = await getWhatsAppAccessToken(tenantId);
      const pid = await getWhatsAppPhoneNumberId(tenantId);
      if (at) accessToken = accessToken || at;
      if (pid) tenantPhoneNumberId = tenantPhoneNumberId || pid;
    }

    if (!accessToken || !tenantPhoneNumberId) {
      res.status(200).json({ received: true, error: 'WhatsApp credentials not found' });
      return;
    }

    const whatsappService = new WhatsAppService(accessToken, tenantPhoneNumberId);
    const messagePayload = await whatsappService.processWebhook(body);

    if (!tenantId && messagePayload?.from) {
      const existingLead = await findLeadByPhone(messagePayload.from);
      if (existingLead) {
        tenantId = existingLead.tenantId;
      }
    }

    if (!messagePayload) {
      res.status(200).json({ received: true });
      return;
    }

    if (!tenantId) {
      res.status(200).json({ received: true, error: 'No tenant for message' });
      return;
    }

    messagePayload.tenantId = tenantId;

    let lead = await findLeadByPhoneInTenant(tenantId, messagePayload.from);

    if (lead) {
      await addInteraction(tenantId, lead.id, {
        type: 'message',
        content: messagePayload.content,
        userId: 'system',
      });
      await updateLead(tenantId, lead.id, { updatedAt: new Date() } as any);
      if (leadOwnerUserId && !lead.assignedTo) {
        await assignLead(tenantId, lead.id, leadOwnerUserId);
      }
      (messagePayload as { leadId?: string }).leadId = lead.id;
    } else {
      lead = await createLead(
        tenantId,
        'whatsapp',
        {
          name: messagePayload.metadata?.contactName || 'Cliente WhatsApp',
          email: '',
          phone: messagePayload.from,
          preferredChannel: 'whatsapp',
          city: '',
        },
        `Mensaje inicial: ${messagePayload.content}`,
        {
          assignedTo: leadOwnerUserId,
          populateStandardContactFields: true,
          vehicleInterest: '',
        }
      );
      (messagePayload as { leadId?: string }).leadId = lead.id;
      await createNotification({
        tenantId,
        userId: leadOwnerUserId || '',
        type: 'lead_created' as any,
        title: 'Nuevo Lead de WhatsApp',
        message: `${messagePayload.metadata?.contactName || 'Cliente'} envió un mensaje`,
        channels: ['system'],
        metadata: { leadId: lead.id } as any,
      } as any);
    }

    const unifiedService = new UnifiedMessagingService(whatsappService);
    await unifiedService.sendMessage(messagePayload as any);

    const leadId = lead.id;

    try {
      const { classifyLeadWithTenantConfig, generateResponseWithTenantConfig } =
        await import('@autodealers/ai');
      const leadDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId)
        .get();
      const leadData = leadDoc.data();

      const classification = await classifyLeadWithTenantConfig(tenantId, {
        name: leadData?.contact?.name || messagePayload.metadata?.contactName || 'Cliente',
        phone: messagePayload.from,
        source: 'whatsapp',
        messages: [messagePayload.content],
      });

      if (classification) {
        await db
          .collection('tenants')
          .doc(tenantId)
          .collection('leads')
          .doc(leadId)
          .update({
            aiClassification: {
              priority: classification.priority,
              sentiment: classification.sentiment,
              intent: classification.intent,
              confidence: classification.confidence,
              reasoning: classification.reasoning,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }

      if (leadData?.status === 'new') {
        const autoResponse = await generateResponseWithTenantConfig(
          tenantId,
          `Lead de WhatsApp - ${leadData?.contact?.name || 'Cliente'}`,
          messagePayload.content,
          leadData?.interactions?.map((i: { content?: string }) => i.content) || []
        );

        if (autoResponse && !autoResponse.requiresApproval) {
          await whatsappService.sendMessage({
            tenantId,
            channel: 'whatsapp',
            direction: 'outbound',
            from: tenantPhoneNumberId,
            to: messagePayload.from,
            content: autoResponse.content,
            metadata: {
              autoGenerated: true,
              leadId,
              aiConfidence: autoResponse.confidence,
            },
          });
        }
      }
    } catch (aiError) {
      console.warn('IA processing skipped:', aiError);
    }

    res.status(200).json({ received: true, leadId });
  } catch (error: unknown) {
    console.error('WhatsApp webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    res.status(400).json({ error: 'Webhook processing failed', details: message });
  }
});

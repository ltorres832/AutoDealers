// Webhook Instagram Direct — alineado con apps/admin (integración + dueño + CRM)

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import {
  createLead,
  findLeadByPhoneInTenant,
  updateLead,
  addInteraction,
  assignLead,
} from '@autodealers/crm';
import { createNotification, resolveMetaWebhookVerifyToken } from '@autodealers/core';
import { UnifiedMessagingService } from '@autodealers/messaging';
import { publicWebhookHttpsOptions } from './public-http';

const db = getFirestore();

export const instagramWebhookGet = onRequest(publicWebhookHttpsOptions, async (req, res) => {
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

export const instagramWebhookPost = onRequest(publicWebhookHttpsOptions, async (req, res) => {
  try {
    // Meta envía GET de verificación a la misma URL que POST: soportar ambos en el endpoint POST.
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

    const body = (req.body || {}) as {
      entry?: Array<{
        id?: string;
        messaging?: Array<{
          message?: { text?: string; mid?: string };
          sender?: { id?: string; name?: string };
          recipient?: { id?: string };
          timestamp?: number;
        }>;
      }>;
    };
    const entry0 = body.entry?.[0];
    const instagramId = entry0?.id;
    if (!instagramId) {
      res.status(200).json({ received: true, error: 'No Instagram ID' });
      return;
    }

    let tenantId: string | null = null;
    let leadOwnerUserId: string | undefined;
    let igIntegrationData: Record<string, unknown> | null = null;

    const igIntSnap = await db
      .collectionGroup('integrations')
      .where('type', '==', 'instagram')
      .where('credentials.instagramId', '==', instagramId)
      .limit(1)
      .get();

    if (!igIntSnap.empty) {
      const igDoc = igIntSnap.docs[0];
      tenantId = igDoc.ref.parent.parent?.id ?? null;
      igIntegrationData = igDoc.data() as Record<string, unknown>;
      const lo = igIntegrationData?.leadOwnerUserId;
      if (typeof lo === 'string' && lo.trim()) {
        leadOwnerUserId = lo.trim();
      }
    }

    if (!tenantId) {
      const tenantsSnapshot = await db
        .collection('tenants')
        .where('settings.instagram.accountId', '==', instagramId)
        .limit(1)
        .get();
      if (!tenantsSnapshot.empty) {
        tenantId = tenantsSnapshot.docs[0].id;
      }
    }

    if (!tenantId) {
      const activeTenants = await db
        .collection('tenants')
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (!activeTenants.empty) {
        tenantId = activeTenants.docs[0].id;
        console.warn(`⚠️ Instagram ${instagramId}: tenant fallback ${tenantId}`);
      } else {
        res.status(200).json({ received: true, error: 'No tenant found' });
        return;
      }
    }

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    const instagramConfig = tenantData?.settings?.instagram as Record<string, unknown> | undefined;

    const creds = (igIntegrationData?.credentials || {}) as Record<string, unknown>;
    const intToken = creds.accessToken as string | undefined;
    const intPageId = creds.pageId as string | undefined;
    const intActive =
      igIntegrationData?.status === 'active' &&
      typeof intToken === 'string' &&
      intToken.length > 0 &&
      typeof intPageId === 'string' &&
      intPageId.length > 0;

    const tenantToken =
      typeof instagramConfig?.accessToken === 'string' ? instagramConfig.accessToken : undefined;
    const tenantPageId =
      typeof instagramConfig?.pageId === 'string' ? instagramConfig.pageId : undefined;
    const tenantEnabled = instagramConfig?.enabled === true;

    if (!intActive && (!tenantEnabled || !tenantToken || !tenantPageId)) {
      res.status(200).json({ received: true, error: 'Instagram not configured' });
      return;
    }

    const accessToken = intToken || tenantToken;
    const pageId = intPageId || tenantPageId;
    if (!accessToken || !pageId) {
      res.status(200).json({ received: true, error: 'Instagram credentials not found' });
      return;
    }

    const messaging = entry0?.messaging?.[0];
    if (!messaging?.message) {
      res.status(200).json({ received: true });
      return;
    }

    const messagePayload = {
      tenantId,
      channel: 'instagram' as const,
      direction: 'inbound' as const,
      from: messaging.sender?.id || '',
      to: messaging.recipient?.id || '',
      content: messaging.message.text || '',
      metadata: {
        messageId: messaging.message.mid,
        timestamp: messaging.timestamp,
        contactName: messaging.sender?.name || 'Cliente Instagram',
      },
    };

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
        'instagram',
        {
          name: messagePayload.metadata.contactName || 'Cliente Instagram',
          email: '',
          phone: messagePayload.from,
          preferredChannel: 'instagram',
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
        title: 'Nuevo Lead de Instagram',
        message: `${messagePayload.metadata.contactName || 'Cliente'} envió un mensaje`,
        channels: ['system'],
        metadata: { leadId: lead.id } as any,
      } as any);
    }

    const unifiedService = new UnifiedMessagingService();
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
        name: leadData?.contact?.name || messagePayload.metadata.contactName || 'Cliente',
        phone: messagePayload.from,
        source: 'instagram',
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
          `Lead de Instagram - ${leadData?.contact?.name || 'Cliente'}`,
          messagePayload.content,
          leadData?.interactions?.map((i: { content?: string }) => i.content) || []
        );

        if (autoResponse && !autoResponse.requiresApproval) {
          const graphRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient: { id: messagePayload.from },
              message: { text: autoResponse.content },
            }),
          });

          if (graphRes.ok) {
            await db
              .collection('tenants')
              .doc(tenantId)
              .collection('messages')
              .add({
                tenantId,
                channel: 'instagram',
                direction: 'outbound',
                from: pageId,
                to: messagePayload.from,
                content: autoResponse.content,
                metadata: {
                  autoGenerated: true,
                  leadId,
                  aiConfidence: autoResponse.confidence,
                },
                status: 'sent',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
          }
        }
      }
    } catch (aiError) {
      console.warn('IA processing skipped:', aiError);
    }

    res.status(200).json({ received: true, leadId });
  } catch (error: unknown) {
    console.error('Instagram webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    res.status(400).json({ error: 'Webhook processing failed', details: message });
  }
});

// Webhook de Facebook Messenger + Meta Lead Ads (leadgen)

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import {
  ingestFacebookLeadgenWebhook,
  createLead,
  findLeadByPhoneInTenant,
  updateLead,
  addInteraction,
  assignLead,
} from '@autodealers/crm';
import { createNotification, resolveMetaWebhookVerifyToken } from '@autodealers/core';
import { FacebookMessengerService } from '@autodealers/messaging';
import { publicWebhookHttpsOptions } from './public-http';

const db = getFirestore();

/**
 * Webhook de Facebook - Verificación GET
 */
export const facebookWebhookGet = onRequest(publicWebhookHttpsOptions, async (req, res) => {
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

/**
 * Webhook de Facebook - POST (Lead Ads + Messenger, alineado con apps/admin)
 */
export const facebookWebhookPost = onRequest(
  publicWebhookHttpsOptions,
  async (req, res) => {
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

      const body = (req.body || {}) as {
        entry?: Array<{
          id?: string;
          changes?: Array<{ field?: string; value?: { leadgen_id?: string; ad_id?: string; form_id?: string; page_id?: string } }>;
          messaging?: Array<Record<string, unknown>>;
        }>;
      };
      const entry0 = body.entry?.[0];

      const changes = entry0?.changes;
      const leadgenChange = Array.isArray(changes)
        ? changes.find((c) => c.field === 'leadgen')
        : undefined;
      if (leadgenChange?.value?.leadgen_id) {
        const result = await ingestFacebookLeadgenWebhook(body as Record<string, unknown>, db);
        if (result.ok) {
          res.status(200).json({
            received: true,
            leadId: result.leadId,
            duplicate: result.duplicate || false,
          });
          return;
        }
        res.status(200).json({ received: true, error: result.error });
        return;
      }

      const pageId = entry0?.id;
      if (!pageId) {
        res.status(200).json({ received: true, error: 'No page ID' });
        return;
      }

      let tenantId: string | null = null;
      let leadOwnerUserId: string | undefined;
      let fbIntegrationData: Record<string, unknown> | null = null;

      const fbIntSnap = await db
        .collectionGroup('integrations')
        .where('type', '==', 'facebook')
        .where('credentials.pageId', '==', pageId)
        .limit(1)
        .get();

      if (!fbIntSnap.empty) {
        const fbDoc = fbIntSnap.docs[0];
        tenantId = fbDoc.ref.parent.parent?.id ?? null;
        fbIntegrationData = fbDoc.data() as Record<string, unknown>;
        const lo = fbIntegrationData?.leadOwnerUserId;
        if (typeof lo === 'string' && lo.trim()) {
          leadOwnerUserId = lo.trim();
        }
      }

      if (!tenantId) {
        const tenantsSnapshot = await db
          .collection('tenants')
          .where('settings.facebook.pageId', '==', pageId)
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
          console.warn(
            `⚠️ No se encontró tenant para Facebook page ${pageId}, usando fallback: ${tenantId}`
          );
        } else {
          res.status(200).json({ received: true, error: 'No tenant found' });
          return;
        }
      }

      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      const tenantData = tenantDoc.data();
      const facebookConfig = tenantData?.settings?.facebook as Record<string, unknown> | undefined;

      const creds = (fbIntegrationData?.credentials || {}) as Record<string, unknown>;
      const intToken = creds.accessToken as string | undefined;
      const intActive =
        fbIntegrationData?.status === 'active' &&
        typeof intToken === 'string' &&
        intToken.length > 0;
      const tenantToken =
        typeof facebookConfig?.accessToken === 'string' ? facebookConfig.accessToken : undefined;
      const tenantEnabled = facebookConfig?.enabled === true;

      if (!intActive && (!tenantEnabled || !tenantToken)) {
        res.status(200).json({ received: true, error: 'Facebook not configured' });
        return;
      }

      const accessToken = intToken || tenantToken;
      if (!accessToken) {
        res.status(200).json({ received: true, error: 'Facebook access token not found' });
        return;
      }

      const messaging = entry0?.messaging?.[0] as
        | { message?: { text?: string; mid?: string }; sender?: { id?: string }; recipient?: { id?: string }; timestamp?: number }
        | undefined;
      if (!messaging?.message) {
        res.status(200).json({ received: true });
        return;
      }

      const facebookService = new FacebookMessengerService(accessToken, pageId);
      const messagePayload = await facebookService.processWebhook(req.body);
      if (!messagePayload) {
        res.status(200).json({ received: true });
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

        await updateLead(tenantId, lead.id, {
          updatedAt: new Date(),
        } as any);

        if (leadOwnerUserId && !lead.assignedTo) {
          await assignLead(tenantId, lead.id, leadOwnerUserId);
        }
      } else {
        lead = await createLead(
          tenantId,
          'facebook',
          {
            name: messagePayload.metadata?.contactName || 'Cliente Facebook',
            email: '',
            phone: messagePayload.from,
            preferredChannel: 'facebook',
            city: '',
          },
          `Mensaje inicial: ${messagePayload.content}`,
          {
            assignedTo: leadOwnerUserId,
            populateStandardContactFields: true,
            vehicleInterest: '',
          }
        );

        await createNotification({
          tenantId,
          userId: leadOwnerUserId || '',
          type: 'lead_created' as any,
          title: 'Nuevo Lead de Facebook',
          message: `${messagePayload.metadata?.contactName || 'Cliente'} envió un mensaje`,
          channels: ['system'],
          metadata: { leadId: lead.id } as any,
        } as any);
      }

      const leadId = lead.id;

      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .add({
          ...messagePayload,
          leadId,
          status: 'received',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

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
          source: 'facebook',
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
            `Lead de Facebook - ${leadData?.contact?.name || 'Cliente'}`,
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
                  channel: 'facebook',
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
      console.error('Facebook webhook error:', error);
      const message = error instanceof Error ? error.message : 'Webhook processing failed';
      res.status(400).json({
        error: 'Webhook processing failed',
        details: message,
      });
    }
  }
);

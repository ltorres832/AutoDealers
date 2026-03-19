// Webhook de Instagram Direct Messages

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Webhook de Instagram - Verificación GET
 */
export const instagramWebhookGet = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'default_verify_token';

    if (mode === 'subscribe' && token === verifyToken) {
      res.set('Content-Type', 'text/plain');
      res.status(200).send(challenge || '');
      return;
    }

    res.status(403).json({ error: 'Invalid token' });
  }
);

/**
 * Webhook de Instagram - Procesamiento POST
 */
export const instagramWebhookPost = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      const body = req.body;

      // Obtener tenantId de la cuenta de Instagram
      const instagramId = body.entry?.[0]?.id;
      if (!instagramId) {
        return res.json({ received: true, error: 'No Instagram ID' });
      }

      // Buscar tenant por Instagram ID
      const tenantsSnapshot = await db
        .collection('tenants')
        .where('settings.instagram.accountId', '==', instagramId)
        .limit(1)
        .get();

      let tenantId: string | null = null;
      if (!tenantsSnapshot.empty) {
        tenantId = tenantsSnapshot.docs[0].id;
      } else {
        const activeTenants = await db
          .collection('tenants')
          .where('status', '==', 'active')
          .limit(1)
          .get();
        
        if (!activeTenants.empty) {
          tenantId = activeTenants.docs[0].id;
          console.warn(`⚠️ No se encontró tenant para Instagram ${instagramId}, usando fallback: ${tenantId}`);
        } else {
          return res.json({ received: true, error: 'No tenant found' });
        }
      }

      // Obtener configuración de Instagram
      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      const tenantData = tenantDoc.data();
      const instagramConfig = tenantData?.settings?.instagram;

      if (!instagramConfig || !instagramConfig.enabled) {
        return res.json({ received: true, error: 'Instagram not configured' });
      }

      const accessToken = instagramConfig.accessToken;
      const pageId = instagramConfig.pageId;
      if (!accessToken || !pageId) {
        return res.json({ received: true, error: 'Instagram credentials not found' });
      }

      // Procesar mensaje (Instagram usa estructura similar a Facebook)
      const entry = body.entry?.[0];
      const messaging = entry?.messaging?.[0];

      if (!messaging || !messaging.message) {
        return res.json({ received: true });
      }

      const messagePayload = {
        tenantId,
        channel: 'instagram' as const,
        direction: 'inbound' as const,
        from: messaging.sender.id,
        to: messaging.recipient.id,
        content: messaging.message.text || '',
        metadata: {
          messageId: messaging.message.mid,
          timestamp: messaging.timestamp,
          contactName: messaging.sender.name || 'Cliente Instagram',
        },
      };

      // Buscar lead existente
      const leadsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .where('contact.phone', '==', messagePayload.from)
        .limit(1)
        .get();

      let leadId: string | null = null;

      if (!leadsSnapshot.empty) {
        const leadDoc = leadsSnapshot.docs[0];
        leadId = leadDoc.id;

        const leadData = leadDoc.data();
        const interactions = leadData.interactions || [];
        interactions.push({
          type: 'message',
          content: messagePayload.content,
          userId: 'system',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db
          .collection('tenants')
          .doc(tenantId)
          .collection('leads')
          .doc(leadId)
          .update({
            interactions,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } else {
        // Nuevo lead
        const newLeadRef = db
          .collection('tenants')
          .doc(tenantId)
          .collection('leads')
          .doc();

        await newLeadRef.set({
          tenantId,
          source: 'instagram',
          status: 'new',
          contact: {
            name: messagePayload.metadata?.contactName || 'Cliente Instagram',
            phone: messagePayload.from,
            preferredChannel: 'instagram',
          },
          notes: `Mensaje inicial: ${messagePayload.content}`,
          interactions: [
            {
              type: 'message',
              content: messagePayload.content,
              userId: 'system',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          ],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        leadId = newLeadRef.id;

        // Crear notificación
        await db.collection('notifications').add({
          tenantId,
          userId: '',
          type: 'lead_created',
          title: 'Nuevo Lead de Instagram',
          message: `${messagePayload.metadata?.contactName || 'Cliente'} envió un mensaje`,
          channels: ['system'],
          metadata: { leadId },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Guardar mensaje
      await db.collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .add({
          ...messagePayload,
          leadId,
          status: 'received',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Procesar con IA (similar a WhatsApp y Facebook)
      try {
        const { classifyLeadWithTenantConfig, generateResponseWithTenantConfig } = await import('@autodealers/ai');
        
        if (leadId) {
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

          // Generar respuesta automática
          if (leadData?.status === 'new') {
            const autoResponse = await generateResponseWithTenantConfig(
              tenantId,
              `Lead de Instagram - ${leadData?.contact?.name || 'Cliente'}`,
              messagePayload.content,
              leadData?.interactions?.map((i: any) => i.content) || []
            );

            if (autoResponse && !autoResponse.requiresApproval) {
              // Enviar respuesta automática vía Instagram Graph API
              const response = await fetch(
                `https://graph.facebook.com/v18.0/${pageId}/messages`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    recipient: { id: messagePayload.from },
                    message: { text: autoResponse.content },
                  }),
                }
              );

              if (response.ok) {
                await db.collection('tenants')
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
        }
      } catch (aiError) {
        console.warn('IA processing skipped:', aiError);
      }

      res.json({ received: true, leadId });
    } catch (error: any) {
      console.error('Instagram webhook error:', error);
      res.status(400).json({
        error: 'Webhook processing failed',
        details: error.message,
      });
    }
  }
);



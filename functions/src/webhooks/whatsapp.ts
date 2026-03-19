// Webhook de WhatsApp Business API

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

const db = getFirestore();
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Webhook de WhatsApp - Verificación GET
 */
export const whatsappWebhookGet = onRequest(
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
 * Webhook de WhatsApp - Procesamiento POST
 */
export const whatsappWebhookPost = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      const body = req.body;

      // Obtener tenantId del número de WhatsApp
      const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || '';
      
      // Buscar tenant por phoneNumberId en integraciones
      const integrationsSnapshot = await db
        .collectionGroup('integrations')
        .where('type', '==', 'whatsapp')
        .where('phoneNumberId', '==', phoneNumberId)
        .limit(1)
        .get();

      let tenantId: string | null = null;
      if (!integrationsSnapshot.empty) {
        const integrationData = integrationsSnapshot.docs[0].data();
        tenantId = integrationData.tenantId;
      } else {
        // Fallback: usar el primer tenant activo
        const tenantsSnapshot = await db
          .collection('tenants')
          .where('status', '==', 'active')
          .limit(1)
          .get();
        
        if (!tenantsSnapshot.empty) {
          tenantId = tenantsSnapshot.docs[0].id;
          console.warn(`⚠️ No se encontró tenant para WhatsApp ${phoneNumberId}, usando fallback: ${tenantId}`);
        } else {
          return res.json({ received: true, error: 'No tenant found' });
        }
      }

      // Obtener configuración de WhatsApp del tenant
      const integrationDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .where('type', '==', 'whatsapp')
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (integrationDoc.empty) {
        return res.json({ received: true, error: 'WhatsApp not configured' });
      }

      const integrationData = integrationDoc.docs[0].data();
      const accessToken = integrationData.accessToken;
      const tenantPhoneNumberId = integrationData.phoneNumberId;

      if (!accessToken || !tenantPhoneNumberId) {
        return res.json({ received: true, error: 'WhatsApp credentials not found' });
      }

      // Procesar webhook para obtener datos del mensaje
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) {
        return res.json({ received: true });
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];

      const messagePayload = {
        tenantId,
        channel: 'whatsapp',
        direction: 'inbound' as const,
        from: message.from,
        to: tenantPhoneNumberId,
        content: message.text?.body || '',
        metadata: {
          messageId: message.id,
          timestamp: message.timestamp,
          contactName: contact?.profile?.name,
        },
      };

      // Buscar lead existente por teléfono
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

        // Actualizar lead con nueva interacción
        await db
          .collection('tenants')
          .doc(tenantId)
          .collection('leads')
          .doc(leadId)
          .update({
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        // Agregar interacción
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
        // Nuevo lead - crear
        const newLeadRef = db
          .collection('tenants')
          .doc(tenantId)
          .collection('leads')
          .doc();

        await newLeadRef.set({
          tenantId,
          source: 'whatsapp',
          status: 'new',
          contact: {
            name: contact?.profile?.name || 'Cliente WhatsApp',
            phone: messagePayload.from,
            preferredChannel: 'whatsapp',
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
          title: 'Nuevo Lead de WhatsApp',
          message: `${contact?.profile?.name || 'Cliente'} envió un mensaje`,
          channels: ['system'],
          metadata: { leadId },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Guardar mensaje en CRM
      await db.collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .add({
          ...messagePayload,
          leadId,
          status: 'received',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Procesar con IA (opcional, no bloquea)
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
          
          // Clasificar lead
          const classification = await classifyLeadWithTenantConfig(tenantId, {
            name: leadData?.contact?.name || contact?.profile?.name || 'Cliente',
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

          // Generar respuesta automática si es nuevo
          if (leadData?.status === 'new') {
            const autoResponse = await generateResponseWithTenantConfig(
              tenantId,
              `Lead de WhatsApp - ${leadData?.contact?.name || 'Cliente'}`,
              messagePayload.content,
              leadData?.interactions?.map((i: any) => i.content) || []
            );

            if (autoResponse && !autoResponse.requiresApproval) {
              // Enviar respuesta automática
              const response = await fetch(
                `${WHATSAPP_API_URL}/${tenantPhoneNumberId}/messages`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: messagePayload.from,
                    type: 'text',
                    text: {
                      body: autoResponse.content,
                    },
                  }),
                }
              );

              if (response.ok) {
                // Guardar mensaje enviado
                await db.collection('tenants')
                  .doc(tenantId)
                  .collection('messages')
                  .add({
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
                    status: 'sent',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  });

                // Agregar interacción
                const interactions = leadData.interactions || [];
                interactions.push({
                  type: 'message',
                  content: `[IA] ${autoResponse.content}`,
                  userId: 'ai-system',
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
              }
            }
          }
        }
      } catch (aiError) {
        console.warn('IA processing skipped:', aiError);
      }

      res.json({ received: true, leadId });
    } catch (error: any) {
      console.error('WhatsApp webhook error:', error);
      res.status(400).json({
        error: 'Webhook processing failed',
        details: error.message,
      });
    }
  }
);



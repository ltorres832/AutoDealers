export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@autodealers/messaging';
import { UnifiedMessagingService } from '@autodealers/messaging';
import { createLead, findLeadByPhone, findLeadByPhoneInTenant, updateLead, addInteraction } from '@autodealers/crm';
import { getTenantByWhatsAppNumber } from '@autodealers/core';
import { createNotification } from '@autodealers/core';

export async function GET(request: NextRequest) {
  // Verificación de webhook de WhatsApp
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  // Obtener verify token desde Firestore
  // TODO: Implementar getMetaVerifyToken en @autodealers/core
  // const { getMetaVerifyToken } = await import('@autodealers/core');
  // const verifyToken = await getMetaVerifyToken();
  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'default_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge || '', {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Obtener tenantId del número de WhatsApp
    const { getWhatsAppPhoneNumberId: getGlobalWhatsAppPhoneNumberId, getFirestore } = await import('@autodealers/core');
    const globalPhoneNumberId = await (getGlobalWhatsAppPhoneNumberId as any)();
    const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || 
                          globalPhoneNumberId;
    let tenantId = await getTenantByWhatsAppNumber(phoneNumberId || '');

    // Si aún no hay tenantId, usar el primero activo (fallback temporal)
    if (!tenantId) {
      const db = getFirestore();
      const tenantsSnapshot = await db
        .collection('tenants')
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!tenantsSnapshot.empty) {
        tenantId = tenantsSnapshot.docs[0].id;
        console.warn(`⚠️ No se encontró tenant para WhatsApp ${phoneNumberId}, usando fallback: ${tenantId}`);
      } else {
        console.error('❌ No hay tenants activos disponibles');
        return NextResponse.json({ received: true, error: 'No tenant found' });
      }
    }

    // Obtener configuración de WhatsApp del tenant
    const { getWhatsAppConfig, getWhatsAppAccessToken, getWhatsAppPhoneNumberId } = await import('@autodealers/core');
    const whatsappConfig = await getWhatsAppConfig(tenantId);
    
    if (!whatsappConfig || !whatsappConfig.enabled) {
      console.warn(`⚠️ WhatsApp no configurado para tenant ${tenantId}`);
      return NextResponse.json({ received: true, error: 'WhatsApp not configured' });
    }

    const accessToken = await getWhatsAppAccessToken(tenantId);
    const tenantPhoneNumberId = await getWhatsAppPhoneNumberId(tenantId);

    if (!accessToken || !tenantPhoneNumberId) {
      console.error(`❌ Credenciales de WhatsApp no encontradas para tenant ${tenantId}`);
      return NextResponse.json({ received: true, error: 'WhatsApp credentials not found' });
    }

    const whatsappService = new WhatsAppService(accessToken, tenantPhoneNumberId);

    // Procesar webhook para obtener datos del mensaje
    const messagePayload = await whatsappService.processWebhook(body);
    
    // Si no se encontró tenantId antes, intentar buscar por lead existente
    if (!tenantId && messagePayload?.from) {
      const existingLead = await findLeadByPhone(messagePayload.from);
      if (existingLead) {
        tenantId = existingLead.tenantId;
      }
    }

    if (!messagePayload) {
      return NextResponse.json({ received: true });
    }

    messagePayload.tenantId = tenantId;

    // Buscar lead existente por teléfono
    let lead = await findLeadByPhoneInTenant(tenantId, messagePayload.from);

    if (lead) {
      // Lead existente - actualizar con nueva interacción
      await addInteraction(tenantId, lead.id, {
        type: 'message',
        content: messagePayload.content,
        userId: 'system', // Sistema para mensajes entrantes
      });

      // Actualizar última actividad
      await updateLead(tenantId, lead.id, {
        updatedAt: new Date(),
      } as any);

      (messagePayload as any).leadId = lead.id;
    } else {
      // Nuevo lead - crear
      lead = await createLead(
        tenantId,
        'whatsapp',
        {
          name: messagePayload.metadata?.contactName || 'Cliente WhatsApp',
          phone: messagePayload.from,
          preferredChannel: 'whatsapp',
        },
        `Mensaje inicial: ${messagePayload.content}`
      );

      (messagePayload as any).leadId = lead.id;

      // Crear notificación para el tenant
      await createNotification({
        tenantId,
        userId: '', // Notificar a todos los usuarios del tenant
        type: 'lead_created' as any,
        title: 'Nuevo Lead de WhatsApp',
        message: `${messagePayload.metadata?.contactName || 'Cliente'} envió un mensaje`,
        channels: ['system'],
        metadata: { leadId: lead.id } as any,
      } as any);
    }

    // Guardar mensaje en CRM
    const unifiedService = new UnifiedMessagingService(whatsappService);
    await unifiedService.sendMessage(messagePayload);

    // Procesar con IA usando configuración del tenant (opcional, no bloquea)
    try {
      const { 
        classifyLeadWithTenantConfig, 
        generateResponseWithTenantConfig,
        analyzeSentimentWithTenantConfig 
      } = await import('@autodealers/ai');
      
      // Clasificar lead automáticamente si está habilitado
      if (lead) {
        const classification = await classifyLeadWithTenantConfig(tenantId, {
          name: lead.contact?.name || messagePayload.metadata?.contactName || 'Cliente',
          phone: messagePayload.from,
          source: 'whatsapp',
          messages: [messagePayload.content],
        });

        if (classification) {
          await updateLead(tenantId, lead.id, {
            aiClassification: {
              priority: classification.priority,
              sentiment: classification.sentiment,
              intent: classification.intent,
              confidence: classification.confidence,
              reasoning: classification.reasoning,
            },
          } as any);
        }

        // Analizar sentimiento
        const sentiment = await analyzeSentimentWithTenantConfig(tenantId, messagePayload.content);
        if (sentiment) {
          await addInteraction(tenantId, lead.id, {
            type: 'note',
            content: `[IA] Sentimiento detectado: ${sentiment}`,
            userId: 'ai-system',
          });
        }

        // Generar respuesta automática si está habilitado y el lead está en estado "new"
        if (lead.status === 'new') {
          const autoResponse = await generateResponseWithTenantConfig(
            tenantId,
            `Lead de WhatsApp - ${lead.contact?.name || 'Cliente'}`,
            messagePayload.content,
            lead.interactions?.map(i => i.content) || []
          );

          if (autoResponse && !autoResponse.requiresApproval) {
            // Enviar respuesta automática solo si no requiere aprobación
            await whatsappService.sendMessage({
              tenantId,
              channel: 'whatsapp',
              direction: 'outbound',
              from: tenantPhoneNumberId,
              to: messagePayload.from,
              content: autoResponse.content,
              metadata: {
                autoGenerated: true,
                leadId: lead.id,
                aiConfidence: autoResponse.confidence,
              },
            });

            // Registrar interacción automática
            await addInteraction(tenantId, lead.id, {
              type: 'message',
              content: `[IA] ${autoResponse.content}`,
              userId: 'ai-system',
            });

            // 🔔 NOTIFICAR A VENDEDORES Y DEALERS cuando la IA responde automáticamente
            const { getUsersByTenant } = await import('@autodealers/core');
            const users = await getUsersByTenant(tenantId);
            const dealersAndSellers = users.filter(u => u.role === 'dealer' || u.role === 'seller');

            for (const user of dealersAndSellers) {
              await createNotification({
                tenantId,
                userId: user.id,
                type: 'system' as any,
                title: '🤖 IA Respondió Automáticamente',
                message: `La IA respondió automáticamente a ${lead.contact?.name || 'cliente'} en WhatsApp: "${autoResponse.content.substring(0, 50)}..."`,
                channels: ['system', 'email'],
                metadata: {
                  leadId: lead.id,
                  channel: 'whatsapp',
                  aiConfidence: autoResponse.confidence,
                  messagePreview: autoResponse.content.substring(0, 100),
                } as any,
              } as any);
            }
          } else if (autoResponse && autoResponse.requiresApproval) {
            // Guardar respuesta pendiente de aprobación
            await addInteraction(tenantId, lead.id, {
              type: 'note',
              content: `[IA - Pendiente Aprobación] ${autoResponse.content}`,
              userId: 'ai-system',
            });

            // 🔔 NOTIFICAR cuando la IA necesita aprobación
            const { getUsersByTenant } = await import('@autodealers/core');
            const users = await getUsersByTenant(tenantId);
            const dealersAndSellers = users.filter(u => u.role === 'dealer' || u.role === 'seller');

            for (const user of dealersAndSellers) {
              await createNotification({
                tenantId,
                userId: user.id,
                type: 'system' as any,
                title: '⚠️ Respuesta de IA Pendiente de Aprobación',
                message: `La IA generó una respuesta para ${lead.contact?.name || 'cliente'} pero requiere tu aprobación antes de enviarla.`,
                channels: ['system', 'email'],
                metadata: {
                  leadId: lead.id,
                  channel: 'whatsapp',
                  suggestedResponse: autoResponse.content,
                  aiConfidence: autoResponse.confidence,
                } as any,
              } as any);
            }
          }
        }
      }
    } catch (aiError) {
      // No fallar si la IA no está disponible
      console.warn('IA processing skipped:', aiError);
    }

    return NextResponse.json({ received: true, leadId: lead.id });
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 400 }
    );
  }
}


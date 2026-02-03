export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { InstagramMessagingService } from '@autodealers/messaging';
import { UnifiedMessagingService } from '@autodealers/messaging';
import { createLead, findLeadByPhoneInTenant, updateLead, addInteraction } from '@autodealers/crm';
import { createNotification, getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  // Verificación de webhook de Instagram
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

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

    // Obtener tenantId de la cuenta de Instagram
    const instagramId = body.entry?.[0]?.id;
    if (!instagramId) {
      return NextResponse.json({ received: true, error: 'No Instagram ID' });
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
        return NextResponse.json({ received: true, error: 'No tenant found' });
      }
    }

    // Obtener configuración de Instagram
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    const instagramConfig = tenantData?.settings?.instagram;

    if (!instagramConfig || !instagramConfig.enabled) {
      return NextResponse.json({ received: true, error: 'Instagram not configured' });
    }

    const accessToken = instagramConfig.accessToken;
    const pageId = instagramConfig.pageId;
    if (!accessToken || !pageId) {
      return NextResponse.json({ received: true, error: 'Instagram credentials not found' });
    }

    const instagramService = new InstagramMessagingService(accessToken, pageId);
    
    // Procesar webhook (Instagram usa estructura similar a Facebook)
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging || !messaging.message) {
      return NextResponse.json({ received: true });
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

      (messagePayload as any).leadId = lead.id;
    } else {
      lead = await createLead(
        tenantId,
        'instagram',
        {
          name: messagePayload.metadata?.contactName || 'Cliente Instagram',
          phone: messagePayload.from,
          preferredChannel: 'instagram',
        },
        `Mensaje inicial: ${messagePayload.content}`
      );

      (messagePayload as any).leadId = lead.id;

      await createNotification({
        tenantId,
        userId: '',
        type: 'lead_created' as any,
        title: 'Nuevo Lead de Instagram',
        message: `${messagePayload.metadata?.contactName || 'Cliente'} envió un mensaje`,
        channels: ['system'],
        metadata: { leadId: lead.id } as any,
      } as any);
    }

    // Guardar mensaje
    const unifiedService = new UnifiedMessagingService();
    await unifiedService.sendMessage(messagePayload);

    // Procesar con IA
    try {
      const { 
        classifyLeadWithTenantConfig, 
        generateResponseWithTenantConfig,
        analyzeSentimentWithTenantConfig 
      } = await import('@autodealers/ai');
      
      if (lead) {
        const classification = await classifyLeadWithTenantConfig(tenantId, {
          name: lead.contact?.name || messagePayload.metadata?.contactName || 'Cliente',
          phone: messagePayload.from,
          source: 'instagram',
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

        const sentiment = await analyzeSentimentWithTenantConfig(tenantId, messagePayload.content);
        if (sentiment) {
          await addInteraction(tenantId, lead.id, {
            type: 'note',
            content: `[IA] Sentimiento detectado: ${sentiment}`,
            userId: 'ai-system',
          });
        }

        // Generar respuesta automática
        if (lead.status === 'new') {
          const autoResponse = await generateResponseWithTenantConfig(
            tenantId,
            `Lead de Instagram - ${lead.contact?.name || 'Cliente'}`,
            messagePayload.content,
            lead.interactions?.map(i => i.content) || []
          );

          if (autoResponse && !autoResponse.requiresApproval) {
            await instagramService.sendMessage({
              tenantId,
              channel: 'instagram',
              direction: 'outbound',
              from: pageId,
              to: messagePayload.from,
              content: autoResponse.content,
              metadata: {
                autoGenerated: true,
                leadId: lead.id,
                aiConfidence: autoResponse.confidence,
              },
            });

            await addInteraction(tenantId, lead.id, {
              type: 'message',
              content: `[IA] ${autoResponse.content}`,
              userId: 'ai-system',
            });

            // 🔔 NOTIFICAR cuando la IA responde automáticamente
            const { getUsersByTenant } = await import('@autodealers/core');
            const users = await getUsersByTenant(tenantId);
            const dealersAndSellers = users.filter(u => u.role === 'dealer' || u.role === 'seller');

            for (const user of dealersAndSellers) {
              await createNotification({
                tenantId,
                userId: user.id,
                type: 'system' as any,
                title: '🤖 IA Respondió Automáticamente',
                message: `La IA respondió automáticamente a ${lead.contact?.name || 'cliente'} en Instagram: "${autoResponse.content.substring(0, 50)}..."`,
                channels: ['system', 'email'],
                metadata: {
                  leadId: lead.id,
                  channel: 'instagram',
                  aiConfidence: autoResponse.confidence,
                  messagePreview: autoResponse.content.substring(0, 100),
                } as any,
              } as any);
            }
          } else if (autoResponse && autoResponse.requiresApproval) {
            await addInteraction(tenantId, lead.id, {
              type: 'note',
              content: `[IA - Pendiente Aprobación] ${autoResponse.content}`,
              userId: 'ai-system',
            });

            // 🔔 NOTIFICAR cuando necesita aprobación
            const { getUsersByTenant } = await import('@autodealers/core');
            const users = await getUsersByTenant(tenantId);
            const dealersAndSellers = users.filter(u => u.role === 'dealer' || u.role === 'seller');

            for (const user of dealersAndSellers) {
              await createNotification({
                tenantId,
                userId: user.id,
                type: 'system' as any,
                title: '⚠️ Respuesta de IA Pendiente de Aprobación',
                message: `La IA generó una respuesta para ${lead.contact?.name || 'cliente'} en Instagram pero requiere tu aprobación.`,
                channels: ['system', 'email'],
                metadata: {
                  leadId: lead.id,
                  channel: 'instagram',
                  suggestedResponse: autoResponse.content,
                  aiConfidence: autoResponse.confidence,
                } as any,
              } as any);
            }
          }
        }
      }
    } catch (aiError) {
      console.warn('IA processing skipped:', aiError);
    }

    return NextResponse.json({ received: true, leadId: lead.id });
  } catch (error: any) {
    console.error('Instagram webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 400 }
    );
  }
}




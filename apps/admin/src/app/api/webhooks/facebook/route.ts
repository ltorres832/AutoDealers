export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { FacebookMessengerService } from '@autodealers/messaging';
import { UnifiedMessagingService } from '@autodealers/messaging';
import { createLead, findLeadByPhoneInTenant, updateLead, addInteraction } from '@autodealers/crm';
import { getFirestore } from '@autodealers/shared';
import { createNotification } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  // Verificación de webhook de Facebook
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

    // Obtener tenantId de la página de Facebook
    const pageId = body.entry?.[0]?.id;
    if (!pageId) {
      return NextResponse.json({ received: true, error: 'No page ID' });
    }

    // Buscar tenant por pageId en configuración
    const tenantsSnapshot = await db
      .collection('tenants')
      .where('settings.facebook.pageId', '==', pageId)
      .limit(1)
      .get();

    let tenantId: string | null = null;
    if (!tenantsSnapshot.empty) {
      tenantId = tenantsSnapshot.docs[0].id;
    } else {
      // Fallback: usar el primer tenant activo
      const activeTenants = await db
        .collection('tenants')
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!activeTenants.empty) {
        tenantId = activeTenants.docs[0].id;
        console.warn(`⚠️ No se encontró tenant para Facebook page ${pageId}, usando fallback: ${tenantId}`);
      } else {
        return NextResponse.json({ received: true, error: 'No tenant found' });
      }
    }

    // Obtener configuración de Facebook del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    const facebookConfig = tenantData?.settings?.facebook;

    if (!facebookConfig || !facebookConfig.enabled) {
      return NextResponse.json({ received: true, error: 'Facebook not configured' });
    }

    const accessToken = facebookConfig.accessToken;
    if (!accessToken) {
      return NextResponse.json({ received: true, error: 'Facebook access token not found' });
    }

    const facebookService = new FacebookMessengerService(accessToken, pageId);
    const messagePayload = await facebookService.processWebhook(body);

    if (!messagePayload) {
      return NextResponse.json({ received: true });
    }

    messagePayload.tenantId = tenantId;

    // Buscar lead existente por ID de Facebook
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
      // Nuevo lead
      lead = await createLead(
        tenantId,
        'facebook',
        {
          name: messagePayload.metadata?.contactName || 'Cliente Facebook',
          phone: messagePayload.from,
          preferredChannel: 'facebook',
        },
        `Mensaje inicial: ${messagePayload.content}`
      );

      (messagePayload as any).leadId = lead.id;

      await createNotification({
        tenantId,
        userId: '',
        type: 'lead_created' as any,
        title: 'Nuevo Lead de Facebook',
        message: `${messagePayload.metadata?.contactName || 'Cliente'} envió un mensaje`,
        channels: ['system'],
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
          source: 'facebook',
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
            `Lead de Facebook - ${lead.contact?.name || 'Cliente'}`,
            messagePayload.content,
            lead.interactions?.map(i => i.content) || []
          );

          if (autoResponse && !autoResponse.requiresApproval) {
            await facebookService.sendMessage({
              tenantId,
              channel: 'facebook',
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
                message: `La IA respondió automáticamente a ${lead.contact?.name || 'cliente'} en Facebook: "${autoResponse.content.substring(0, 50)}..."`,
                channels: ['system', 'email'],
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
                message: `La IA generó una respuesta para ${lead.contact?.name || 'cliente'} en Facebook pero requiere tu aprobación.`,
                channels: ['system', 'email'],
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
    console.error('Facebook webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 400 }
    );
  }
}




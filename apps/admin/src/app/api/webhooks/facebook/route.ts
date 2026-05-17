export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { FacebookMessengerService } from '@autodealers/messaging';
import { UnifiedMessagingService } from '@autodealers/messaging';
import { createLead, findLeadByPhoneInTenant, updateLead, addInteraction, assignLead } from '@autodealers/crm';
import { getFirestore } from '@autodealers/shared';
import { createNotification, resolveMetaWebhookVerifyToken } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  // Verificación de webhook de Facebook
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  const verifyToken = await resolveMetaWebhookVerifyToken();

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge || '', {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const qMode = url.searchParams.get('hub.mode');
    const qToken = url.searchParams.get('hub.verify_token');
    const qChallenge = url.searchParams.get('hub.challenge');
    if (qMode === 'subscribe' && qToken != null && qChallenge != null) {
      const verifyToken = await resolveMetaWebhookVerifyToken();
      if (qToken === verifyToken) {
        return new NextResponse(qChallenge, {
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    const body = await request.json();

    const entry0 = body.entry?.[0] as { changes?: Array<{ field?: string; value?: { leadgen_id?: string } }> } | undefined;
    const leadgenChange = entry0?.changes?.find((c) => c.field === 'leadgen');
    if (leadgenChange?.value?.leadgen_id) {
      const { processFacebookLeadgenFromBody } = await import('./leadgen-post');
      return processFacebookLeadgenFromBody(body, db);
    }

    // Obtener tenantId de la página de Facebook
    const pageId = body.entry?.[0]?.id;
    if (!pageId) {
      return NextResponse.json({ received: true, error: 'No page ID' });
    }

    // Resolver tenant y dueño del canal (integración OAuth del seller/dealer)
    let tenantId: string | null = null;
    let leadOwnerUserId: string | undefined;
    let fbIntegrationData: Record<string, any> | null = null;

    const fbIntSnap = await db
      .collectionGroup('integrations')
      .where('type', '==', 'facebook')
      .where('credentials.pageId', '==', pageId)
      .limit(1)
      .get();

    if (!fbIntSnap.empty) {
      const fbDoc = fbIntSnap.docs[0];
      tenantId = fbDoc.ref.parent.parent?.id ?? null;
      fbIntegrationData = fbDoc.data();
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
        console.warn(`⚠️ No se encontró tenant para Facebook page ${pageId}, usando fallback: ${tenantId}`);
      } else {
        return NextResponse.json({ received: true, error: 'No tenant found' });
      }
    }

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    const facebookConfig = tenantData?.settings?.facebook;

    const intToken = fbIntegrationData?.credentials?.accessToken;
    const intActive =
      fbIntegrationData?.status === 'active' &&
      typeof intToken === 'string' &&
      intToken.length > 0;

    const tenantToken =
      typeof facebookConfig?.accessToken === 'string' ? facebookConfig.accessToken : undefined;
    const tenantEnabled = facebookConfig?.enabled === true;

    if (!intActive && (!tenantEnabled || !tenantToken)) {
      return NextResponse.json({ received: true, error: 'Facebook not configured' });
    }

    const accessToken = intToken || tenantToken;
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

      if (leadOwnerUserId && !lead.assignedTo) {
        await assignLead(tenantId, lead.id, leadOwnerUserId);
      }

      (messagePayload as any).leadId = lead.id;
    } else {
      // Nuevo lead
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

      (messagePayload as any).leadId = lead.id;

      await createNotification({
        tenantId,
        userId: leadOwnerUserId || '',
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




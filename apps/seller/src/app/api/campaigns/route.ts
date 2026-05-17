import { NextRequest, NextResponse } from 'next/server';
import { createCampaign, getCampaigns, getFirestore } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';
import * as admin from 'firebase-admin';
import { SocialPublisherService, type PublishResult, MetaMarketingPublisherService } from '@autodealers/messaging';
import { pickSocialPlatforms, campaignContentToPostContent } from '@/lib/campaign-social-publish';

function resolveFacebookDailyBudgetMajor(
  budgets: Array<{ platform: string; amount: number; dailyLimit?: number }> | undefined
): number {
  const fb = budgets?.find((b) => b.platform === 'facebook');
  if (fb?.dailyLimit != null && fb.dailyLimit > 0) return Math.min(fb.dailyLimit, 50000);
  if (fb?.amount != null && fb.amount > 0) return Math.max(1, Math.round(fb.amount / 30));
  return 5;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const campaigns = await getCampaigns(auth.tenantId, {
      status: status as any,
    });

    return NextResponse.json({
      campaigns: campaigns.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validar campos requeridos
    if (!body.name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    if (!body.platforms || body.platforms.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos una plataforma' }, { status: 400 });
    }

    // Validar que la membresía permita redes sociales (opcional, no bloquea si falla)
    try {
      const { tenantHasFeature } = await import('@autodealers/core');
      const canUseSocial = await tenantHasFeature(auth.tenantId, 'socialMediaEnabled');
      if (!canUseSocial) {
        return NextResponse.json(
          { error: 'Su membresía no incluye gestión de campañas en redes sociales' },
          { status: 403 }
        );
      }
    } catch (featureError) {
      console.warn('Could not check feature:', featureError);
      // Continuar sin bloquear si no se puede verificar
    }

    // Validar campos obligatorios
    if (!body.description) {
      return NextResponse.json({ error: 'La descripción es requerida' }, { status: 400 });
    }

    if (!body.content) {
      return NextResponse.json({ error: 'El contenido es requerido' }, { status: 400 });
    }

    // Convertir content de string a objeto si es necesario
    let contentObj = body.content;
    if (typeof body.content === 'string') {
      contentObj = {
        text: body.content,
        images: body.images || [],
        videos: body.videos || [],
      };
    } else if (!body.content) {
      contentObj = {
        text: '',
        images: body.images || [],
        videos: body.videos || [],
      };
    } else {
      // Si ya es un objeto, asegurarse de incluir imágenes y videos
      contentObj = {
        ...contentObj,
        images: body.images || contentObj.images || [],
        videos: body.videos || contentObj.videos || [],
      };
    }

    // Mapear tipos de campaña
    const campaignTypeMap: Record<string, 'promotion' | 'awareness' | 'conversion' | 'engagement'> = {
      'social_media': 'promotion',
      'email': 'promotion',
      'whatsapp': 'promotion',
      'sms': 'promotion',
      'promotion': 'promotion',
      'awareness': 'awareness',
      'conversion': 'conversion',
      'engagement': 'engagement',
    };
    const campaignType = campaignTypeMap[body.type] || 'promotion';

    const metaDistribution: 'organic' | 'paid_ads' =
      body.metaDistribution === 'paid_ads' ? 'paid_ads' : 'organic';

    const campaign = await createCampaign({
      tenantId: auth.tenantId,
      name: body.name,
      description: body.description || '',
      type: campaignType,
      platforms: body.platforms,
      budgets: body.budgets || [],
      content: contentObj,
      schedule: body.schedule || undefined,
      status: body.status || 'draft',
      aiGenerated: body.aiGenerated || false,
      metaDistribution,
    });

    const effectiveStatus = body.status || 'draft';
    const socialPlatforms = pickSocialPlatforms(body.platforms);
    const wantOrganicSocialPublish =
      metaDistribution === 'organic' &&
      body.publishToSocial !== false &&
      socialPlatforms.length > 0 &&
      effectiveStatus === 'active';

    let socialPublish:
      | { attempted: boolean; results?: PublishResult[]; skippedReason?: string }
      | undefined;

    let metaAdsPublish:
      | {
          attempted: boolean;
          success?: boolean;
          metaCampaignId?: string;
          metaAdSetId?: string;
          error?: string;
          skippedReason?: string;
        }
      | undefined;

    if (socialPlatforms.length > 0) {
      if (metaDistribution === 'paid_ads') {
        if (effectiveStatus !== 'active') {
          socialPublish = { attempted: false, skippedReason: 'campaign_not_active' };
        }
      } else if (body.publishToSocial !== false && effectiveStatus !== 'active') {
        socialPublish = { attempted: false, skippedReason: 'campaign_not_active' };
      }
    }

    if (wantOrganicSocialPublish && socialPlatforms.length > 0) {
      try {
        const { tenantHasFeature } = await import('@autodealers/core');
        const canUseSocial = await tenantHasFeature(auth.tenantId, 'socialMediaEnabled');
        if (!canUseSocial) {
          socialPublish = { attempted: false, skippedReason: 'membership_social_disabled' };
        } else {
          const publisher = new SocialPublisherService();
          const postContent = campaignContentToPostContent(
            contentObj,
            String(body.description || ''),
            String(body.name || '')
          );
          const results = await publisher.publishToMultiple(auth.tenantId, postContent, socialPlatforms);
          socialPublish = { attempted: true, results };
          await getFirestore()
            .collection('tenants')
            .doc(auth.tenantId)
            .collection('campaigns')
            .doc(campaign.id)
            .update({
              socialPublishAt: admin.firestore.FieldValue.serverTimestamp(),
              socialPublishResults: results,
            });
        }
      } catch (socialErr) {
        console.error('[campaigns] social publish after create:', socialErr);
        socialPublish = {
          attempted: true,
          results: socialPlatforms.map((platform) => ({
            success: false,
            platform,
            error: socialErr instanceof Error ? socialErr.message : 'Error al publicar',
          })),
        };
      }
    }

    const wantPaidMetaStructure =
      metaDistribution === 'paid_ads' &&
      socialPlatforms.length > 0 &&
      effectiveStatus === 'active' &&
      socialPlatforms.includes('facebook');

    if (metaDistribution === 'paid_ads' && socialPlatforms.length > 0 && effectiveStatus === 'active') {
      if (!socialPlatforms.includes('facebook')) {
        metaAdsPublish = {
          attempted: false,
          skippedReason: 'paid_ads_requires_facebook',
          error:
            'Para crear borradores en Meta Ads automáticamente, incluye Facebook en las plataformas (usa la cuenta publicitaria vinculada).',
        };
      }
    }

    if (wantPaidMetaStructure) {
      try {
        const { tenantHasFeature } = await import('@autodealers/core');
        const canUseSocial = await tenantHasFeature(auth.tenantId, 'socialMediaEnabled');
        if (!canUseSocial) {
          metaAdsPublish = { attempted: false, skippedReason: 'membership_social_disabled', error: 'Plan sin redes' };
        } else {
          const adsPub = new MetaMarketingPublisherService();
          const r = await adsPub.createDraftCampaignAndAdSet(auth.tenantId, {
            name: body.name,
            dailyBudgetMajorUnits: resolveFacebookDailyBudgetMajor(body.budgets),
          });
          metaAdsPublish = {
            attempted: true,
            success: r.success,
            metaCampaignId: r.metaCampaignId,
            metaAdSetId: r.metaAdSetId,
            error: r.error,
          };
          const patch: Record<string, unknown> = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          if (r.success && r.metaCampaignId) {
            patch.metaAdsCampaignId = r.metaCampaignId;
            if (r.metaAdSetId) patch.metaAdsAdSetId = r.metaAdSetId;
            patch.metaAdsPublishError = admin.firestore.FieldValue.delete();
          } else {
            patch.metaAdsPublishError = r.error || 'Error al crear en Meta';
          }
          await getFirestore()
            .collection('tenants')
            .doc(auth.tenantId)
            .collection('campaigns')
            .doc(campaign.id)
            .update(patch);
        }
      } catch (adsErr) {
        console.error('[campaigns] Meta paid draft after create:', adsErr);
        const errMsg = adsErr instanceof Error ? adsErr.message : 'Error al crear anuncios en Meta';
        metaAdsPublish = { attempted: true, success: false, error: errMsg };
        await getFirestore()
          .collection('tenants')
          .doc(auth.tenantId)
          .collection('campaigns')
          .doc(campaign.id)
          .update({
            metaAdsPublishError: errMsg,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    }

    return NextResponse.json(
      {
        campaign: {
          ...campaign,
          createdAt: campaign.createdAt.toISOString(),
          updatedAt: campaign.updatedAt.toISOString(),
        },
        socialPublish,
        metaAdsPublish,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}


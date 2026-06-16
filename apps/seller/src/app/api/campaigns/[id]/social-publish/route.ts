import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { SocialPublisherService, type PublishResult, MetaMarketingPublisherService } from '@autodealers/messaging';
import {
  pickSocialPlatforms,
  campaignContentToPostContent,
  campaignContentLink,
} from '@/lib/campaign-social-publish';

export const dynamic = 'force-dynamic';

function resolveFacebookDailyBudgetMajor(
  budgets: Array<{ platform: string; amount: number; dailyLimit?: number }> | undefined
): number {
  const fb = budgets?.find((b) => b.platform === 'facebook');
  if (fb?.dailyLimit != null && fb.dailyLimit > 0) return Math.min(fb.dailyLimit, 50000);
  if (fb?.amount != null && fb.amount > 0) return Math.max(1, Math.round(fb.amount / 30));
  return 5;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const snap = await getFirestore()
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('campaigns')
      .doc(campaignId)
      .get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    const d = snap.data() as Record<string, unknown>;
    const socialPlatforms = pickSocialPlatforms(d.platforms);
    if (socialPlatforms.length === 0) {
      return NextResponse.json(
        { error: 'La campaña no incluye Facebook ni Instagram' },
        { status: 400 }
      );
    }

    const { tenantHasFeature } = await import('@autodealers/core');
    const canUseSocial = await tenantHasFeature(auth.tenantId, 'socialMediaEnabled');
    if (!canUseSocial) {
      return NextResponse.json(
        { error: 'Tu plan no incluye publicación en redes sociales' },
        { status: 403 }
      );
    }

    if (d.metaDistribution === 'paid_ads') {
      if (d.metaAdsAdId) {
        return NextResponse.json({
          success: true,
          alreadyPublished: true,
          metaAdId: String(d.metaAdsAdId),
        });
      }
      if (!socialPlatforms.includes('facebook')) {
        return NextResponse.json(
          { error: 'Los anuncios de pago requieren Facebook en las plataformas de la campaña.' },
          { status: 400 }
        );
      }

      const postContent = campaignContentToPostContent(
        d.content,
        String(d.description ?? ''),
        String(d.name ?? '')
      );
      const adsPub = new MetaMarketingPublisherService();
      const publicWebBase = (
        process.env.NEXT_PUBLIC_PUBLIC_WEB_URL || 'https://autodealers-7f62e.web.app'
      ).replace(/\/$/, '');
      const landingUrl =
        campaignContentLink(d.content) ||
        (auth.userId ? `${publicWebBase}/seller/${auth.userId}` : '') ||
        (await adsPub.resolveTenantLandingUrl(auth.tenantId));
      const budgets = Array.isArray(d.budgets)
        ? (d.budgets as Array<{ platform: string; amount: number; dailyLimit?: number }>)
        : undefined;
      const r = await adsPub.createAndLaunchPaidCampaign(auth.tenantId, {
        name: String(d.name ?? 'Campaña'),
        dailyBudgetMajorUnits: resolveFacebookDailyBudgetMajor(budgets),
        message: postContent.text,
        imageUrl: postContent.imageUrl,
        linkUrl: landingUrl,
        platforms: socialPlatforms,
      });

      const patch: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (r.success && r.metaCampaignId) {
        patch.metaAdsCampaignId = r.metaCampaignId;
        if (r.metaAdSetId) patch.metaAdsAdSetId = r.metaAdSetId;
        if (r.metaCreativeId) patch.metaAdsCreativeId = r.metaCreativeId;
        if (r.metaAdId) patch.metaAdsAdId = r.metaAdId;
        patch.metaAdsPublishError = admin.firestore.FieldValue.delete();
      } else {
        patch.metaAdsPublishError = r.error || 'Error al publicar en Meta';
      }
      await snap.ref.update(patch);

      if (!r.success) {
        return NextResponse.json({ error: r.error || 'No se pudo publicar en Meta' }, { status: 502 });
      }

      return NextResponse.json({
        success: true,
        metaAdsPublish: r,
      });
    }

    const postContent = campaignContentToPostContent(
      d.content,
      String(d.description ?? ''),
      String(d.name ?? '')
    );

    const publisher = new SocialPublisherService();
    const results: PublishResult[] = await publisher.publishToMultiple(
      auth.tenantId,
      postContent,
      socialPlatforms
    );

    await snap.ref.update({
      socialPublishAt: admin.firestore.FieldValue.serverTimestamp(),
      socialPublishResults: results,
    });

    return NextResponse.json({ success: true, results });
  } catch (e) {
    console.error('[campaigns social-publish]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    );
  }
}

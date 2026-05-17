import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { SocialPublisherService, type PublishResult } from '@autodealers/messaging';
import { pickSocialPlatforms, campaignContentToPostContent } from '@/lib/campaign-social-publish';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
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
    if (d.metaDistribution === 'paid_ads') {
      return NextResponse.json(
        {
          error:
            'Esta campaña está marcada como anuncios de pago (Meta Ads). No se publica como post orgánico. Crea el anuncio en Meta Ads Manager; el cobro va a la cuenta publicitaria configurada allí. La creación automática de Ads desde esta app está en desarrollo.',
        },
        { status: 400 }
      );
    }
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

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  getPayrollPartnerConfig,
  savePayrollPartnerConfig,
  createJobOpening,
  listJobOpenings,
  getJobOpening,
  updateJobOpening,
  updateJobOpeningStatus,
  markJobOpeningPublished,
  formatJobOpeningSocialPost,
  createJobApplication,
  listJobApplications,
  updateApplicationStatus,
} from '@autodealers/crm';
import { SocialPublisherService } from '@autodealers/messaging';
import { normalizeSocialPostContent, isTikTokYouTubePublishEnabled } from '@autodealers/core';
import { getFirestore } from '@autodealers/shared';
import { validateMembershipFeature } from '@/lib/membership-middleware';

export const dynamic = 'force-dynamic';

const publisher = new SocialPublisherService();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const view = new URL(request.url).searchParams.get('view') || 'payroll';
    const openingId = new URL(request.url).searchParams.get('openingId') || undefined;

    if (view === 'openings') {
      const openings = await listJobOpenings(auth.tenantId);
      return NextResponse.json({ openings });
    }
    if (view === 'applications') {
      const applications = await listJobApplications(auth.tenantId, openingId);
      return NextResponse.json({ applications });
    }

    const config = await getPayrollPartnerConfig(auth.tenantId);
    return NextResponse.json({ config });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const action = String(body.action || 'save_payroll');

    if (action === 'save_payroll') {
      const config = await savePayrollPartnerConfig(
        auth.tenantId,
        {
          partner: body.partner,
          enabled: body.enabled === true,
          portalUrl: body.portalUrl,
          companyCode: body.companyCode,
          notes: body.notes,
        },
        auth.userId
      );
      return NextResponse.json({ config });
    }

    if (action === 'create_opening') {
      const opening = await createJobOpening({
        tenantId: auth.tenantId,
        title: body.title,
        department: body.department,
        description: body.description,
        location: body.location,
        employmentType: body.employmentType,
        salaryRange: body.salaryRange,
        requirements: body.requirements,
        benefits: body.benefits,
        applyEmail: body.applyEmail,
        applyPhone: body.applyPhone,
        applyUrl: body.applyUrl,
        slots: body.slots != null ? Number(body.slots) : undefined,
        createdBy: auth.userId,
      });
      return NextResponse.json({ opening }, { status: 201 });
    }

    if (action === 'update_opening') {
      const opening = await updateJobOpening(auth.tenantId, String(body.id), {
        title: body.title,
        department: body.department,
        description: body.description,
        location: body.location,
        employmentType: body.employmentType,
        salaryRange: body.salaryRange,
        requirements: body.requirements,
        benefits: body.benefits,
        applyEmail: body.applyEmail,
        applyPhone: body.applyPhone,
        applyUrl: body.applyUrl,
        slots: body.slots != null ? Number(body.slots) : undefined,
        status: body.status,
      });
      return NextResponse.json({ opening });
    }

    if (action === 'opening_status') {
      await updateJobOpeningStatus(auth.tenantId, String(body.id), body.status);
      return NextResponse.json({ ok: true });
    }

    if (action === 'publish_opening_social') {
      const featureValidation = await validateMembershipFeature(request, 'useSocialMedia');
      if (featureValidation !== null) return featureValidation;

      const platforms = (Array.isArray(body.platforms) ? body.platforms : []).filter(
        (p: string) => {
          if (p === 'facebook' || p === 'instagram') return true;
          if (
            isTikTokYouTubePublishEnabled() &&
            (p === 'tiktok' || p === 'youtube')
          ) {
            return true;
          }
          return false;
        }
      ) as ('facebook' | 'instagram' | 'tiktok' | 'youtube')[];
      if (platforms.length === 0) {
        return NextResponse.json(
          {
            error: isTikTokYouTubePublishEnabled()
              ? 'Selecciona al menos una red (Facebook, Instagram, TikTok o YouTube)'
              : 'Selecciona Facebook y/o Instagram',
          },
          { status: 400 }
        );
      }

      const needsVideo = platforms.some((p) => p === 'tiktok' || p === 'youtube');
      const videoUrl =
        typeof body.videoUrl === 'string' && body.videoUrl.trim()
          ? body.videoUrl.trim()
          : undefined;
      if (needsVideo && !videoUrl) {
        return NextResponse.json(
          {
            error:
              'TikTok y YouTube requieren un video. Pega una URL pública (MP4) en el campo de video.',
          },
          { status: 400 }
        );
      }

      const opening = await getJobOpening(auth.tenantId, String(body.id));
      if (!opening) return NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 });
      if (opening.status === 'closed') {
        return NextResponse.json(
          { error: 'No puedes publicar una vacante cerrada. Reábrela o créala de nuevo.' },
          { status: 400 }
        );
      }

      const tenantDoc = await getFirestore().collection('tenants').doc(auth.tenantId).get();
      const dealerName =
        (tenantDoc.data()?.companyName as string) ||
        (tenantDoc.data()?.name as string) ||
        'Nuestro concesionario';

      const { text, hashtags } = formatJobOpeningSocialPost(opening, dealerName);
      const customText = typeof body.customText === 'string' && body.customText.trim()
        ? body.customText.trim()
        : text;

      const normalizedContent = await normalizeSocialPostContent({
        content: {
          text: customText,
          hashtags,
          imageUrl: body.imageUrl || undefined,
          videoUrl,
        },
        tenantId: auth.tenantId,
        userId: auth.userId,
        accountType: 'dealer',
      });

      const results = await publisher.publishToMultiple(
        auth.tenantId,
        normalizedContent,
        platforms
      );

      const allSuccess = results.every((r) => r.success);
      const failures = results.filter((r) => !r.success);
      const failureDetail = failures
        .map((r) => `${r.platform}: ${r.error || 'error'}`)
        .join(' · ');

      if (!allSuccess && failures.length === results.length) {
        return NextResponse.json(
          {
            success: false,
            results,
            error: failureDetail || 'No se pudo publicar en ninguna red',
          },
          { status: 422 }
        );
      }

      const okPlatforms = results
        .filter((r) => r.success)
        .map((r) => r.platform as 'facebook' | 'instagram' | 'tiktok' | 'youtube');
      if (okPlatforms.length > 0) {
        await markJobOpeningPublished(auth.tenantId, opening.id, okPlatforms);
      }

      return NextResponse.json({
        success: allSuccess,
        results,
        message: allSuccess
          ? 'Vacante publicada en redes'
          : `Publicado parcialmente. ${failureDetail}`,
        ...(failures.length > 0 ? { error: failureDetail } : {}),
      });
    }

    if (action === 'create_application') {
      const application = await createJobApplication({
        tenantId: auth.tenantId,
        openingId: String(body.openingId),
        candidateName: body.candidateName,
        email: body.email,
        phone: body.phone,
        notes: body.notes,
      });
      return NextResponse.json({ application }, { status: 201 });
    }

    if (action === 'application_status') {
      await updateApplicationStatus(auth.tenantId, String(body.id), body.status);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

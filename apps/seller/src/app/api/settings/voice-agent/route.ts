import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantMembershipFeatures } from '@autodealers/core';
import {
  getVoiceConfigOrDefault,
  saveVoiceConfig,
  ensureVoiceProvisionedForTenant,
  type VoiceConfig,
} from '@autodealers/voice';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const features = await getTenantMembershipFeatures(auth.tenantId);
    const enabled = features?.voiceAIEnabled === true;
    let config = await getVoiceConfigOrDefault(auth.tenantId);
    let provision = null as Awaited<ReturnType<typeof ensureVoiceProvisionedForTenant>> | null;

    if (enabled) {
      const needsLine =
        !config.twilioPhoneNumber ||
        config.provisioning?.status === 'error' ||
        config.provisioning?.status === 'pending';
      if (needsLine || config.enabled !== true) {
        provision = await ensureVoiceProvisionedForTenant(auth.tenantId, {
          source: 'seller_voice_settings_get',
          updatedBy: auth.userId,
        });
        if (provision.config) config = provision.config;
        else config = await getVoiceConfigOrDefault(auth.tenantId);
      }
    }

    return NextResponse.json({
      config,
      provision,
      membership: {
        voiceAIEnabled: enabled,
        voiceInboundEnabled: features?.voiceInboundEnabled === true,
        voiceOutboundEnabled: features?.voiceOutboundEnabled === true,
        voiceServiceCallsEnabled: features?.voiceServiceCallsEnabled === true,
        voiceCampaignsEnabled: features?.voiceCampaignsEnabled === true,
      },
    });
  } catch (e) {
    console.error('[voice-agent seller] GET', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const features = await getTenantMembershipFeatures(auth.tenantId);
    if (!features || features.voiceAIEnabled !== true) {
      return NextResponse.json(
        {
          error:
            'El Agente de Voz IA no está incluido en tu plan. Mejora tu membresía para activarlo.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const current = await getVoiceConfigOrDefault(auth.tenantId);
    const platformAssigned =
      current.provisioning?.status === 'ready' && Boolean(current.twilioPhoneNumber);

    const patch: Partial<VoiceConfig> = {
      enabled: body.enabled === true,
      inboundEnabled: body.inboundEnabled !== false,
      outboundEnabled: body.outboundEnabled !== false,
    };
    if (body.persona && typeof body.persona === 'object') patch.persona = body.persona;
    if (typeof body.recordingDisclosure === 'string' && body.recordingDisclosure.trim()) {
      patch.recordingDisclosure = body.recordingDisclosure.trim();
    }
    if (body.service && typeof body.service === 'object') patch.service = body.service;
    if (Array.isArray(body.incentives)) patch.incentives = body.incentives;
    if (body.socialAutoCall && typeof body.socialAutoCall === 'object') {
      patch.socialAutoCall = body.socialAutoCall;
    }
    if (body.businessHours && typeof body.businessHours === 'object') {
      patch.businessHours = body.businessHours;
    }
    if (typeof body.businessRules === 'string') patch.businessRules = body.businessRules;
    if (typeof body.guardrails === 'string') patch.guardrails = body.guardrails;
    if (typeof body.escalationPhoneNumber === 'string') {
      patch.escalationPhoneNumber = body.escalationPhoneNumber;
    }
    if (!platformAssigned && typeof body.twilioPhoneNumber === 'string') {
      patch.twilioPhoneNumber = body.twilioPhoneNumber.trim();
    }

    const config = await saveVoiceConfig(auth.tenantId, patch, auth.userId);
    return NextResponse.json({ success: true, config });
  } catch (e) {
    console.error('[voice-agent seller] PUT', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

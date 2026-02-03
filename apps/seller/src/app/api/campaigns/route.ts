import { NextRequest, NextResponse } from 'next/server';
import { createCampaign, getCampaigns } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

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
    });

    return NextResponse.json({ 
      campaign: {
        ...campaign,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      }
    }, { status: 201 });
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


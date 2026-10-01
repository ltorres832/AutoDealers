import { getFirestore } from '@autodealers/shared';
import { officialVehicleDescription } from '@autodealers/shared/vehicle-description';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { PLATFORM_SOCIAL_TENANT_ID } from '@autodealers/core';
import { SocialPublisherService, type PostContent } from '@autodealers/messaging';

const publisher = new SocialPublisherService();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (body.vehicleId || body.content?.vehicleId) {
      const id = body.vehicleId || body.content.vehicleId;
      const tenant = body.vehicleTenantId || body.content?.vehicleTenantId;
      if (typeof id !== 'string' || typeof tenant !== 'string' || !/^[a-zA-Z0-9_-]{1,150}$/.test(id) || !/^[a-zA-Z0-9_-]{1,150}$/.test(tenant)) return NextResponse.json({error:'Vehículo inválido'},{status:400});
      const vehicle = await getFirestore().collection('tenants').doc(tenant).collection('vehicles').doc(id).get();
      if (!vehicle.exists) return NextResponse.json({error:'Vehículo no disponible'},{status:404});
      body.content = {...body.content, vehicleId:id, vehicleTenantId:tenant, text:officialVehicleDescription(vehicle.data() || {}), hashtags:[]};
    }
    const {
      content,
      platforms,
    }: {
      content: PostContent;
      platforms: ('facebook' | 'instagram')[];
    } = body;

    if (!content?.text) {
      return NextResponse.json({ error: 'El contenido del post es requerido' }, { status: 400 });
    }
    if (!platforms?.length) {
      return NextResponse.json({ error: 'Selecciona al menos una plataforma' }, { status: 400 });
    }

    const results = await publisher.publishToMultiple(
      PLATFORM_SOCIAL_TENANT_ID,
      content,
      platforms
    );
    const allSuccess = results.every((r) => r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? 'Publicado con la cuenta de soporte de AutoDealersOnline'
        : 'Algunas publicaciones fallaron',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Admin social publish:', error);
    return NextResponse.json({ error: 'Error al publicar', details: message }, { status: 500 });
  }
}

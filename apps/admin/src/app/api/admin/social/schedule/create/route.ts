import { getFirestore } from '@autodealers/shared';
import { officialVehicleDescription } from '@autodealers/shared/vehicle-description';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { schedulePost, PLATFORM_SOCIAL_TENANT_ID } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin' || !auth.userId) {
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
    const { content, platforms, scheduledFor, vehicleId, aiGenerated } = body;

    if (!content || !platforms || !scheduledFor) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const scheduledPost = await schedulePost({
      tenantId: PLATFORM_SOCIAL_TENANT_ID,
      userId: auth.userId,
      content,
      platforms,
      scheduledFor: new Date(scheduledFor),
      vehicleId,
      aiGenerated: aiGenerated || false,
    });

    return NextResponse.json({ post: scheduledPost }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

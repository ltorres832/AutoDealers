export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createPromotion, getPromotions } from '@autodealers/core';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const promotions = await getPromotions(auth.tenantId);

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const promotion = await createPromotion({
      tenantId: auth.tenantId,
      name: body.name,
      description: body.description,
      type: body.type,
      discount: body.discount,
      applicableVehicles: body.applicableVehicles,
      applicableToAll: body.applicableToAll,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status || 'active',
      autoSendToLeads: body.autoSendToLeads || false,
      autoSendToCustomers: body.autoSendToCustomers || false,
      channels: body.channels || ['whatsapp'],
      aiGenerated: body.aiGenerated || false,
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}






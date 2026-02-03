import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createPromotion } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// Tenant especial para promociones internas del admin
const ADMIN_INTERNAL_TENANT_ID = 'system';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener promociones internas del sistema
    const promotionsSnapshot = await db
      .collection('tenants')
      .doc(ADMIN_INTERNAL_TENANT_ID)
      .collection('promotions')
      .where('isInternal', '==', true)
      .where('createdByAdmin', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const promotions = promotionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate()?.toISOString(),
        endDate: data.endDate?.toDate()?.toISOString(),
        expiresAt: data.expiresAt?.toDate()?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
        updatedAt: data.updatedAt?.toDate()?.toISOString(),
      };
    });

    return NextResponse.json({ promotions });
  } catch (error: any) {
    console.error('Error fetching internal promotions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Crear promoción interna usando el tenant del sistema
    const promotion = await createPromotion({
      tenantId: ADMIN_INTERNAL_TENANT_ID,
      name: body.name,
      description: body.description,
      type: body.type,
      discount: body.discount,
      applicableVehicles: body.applicableVehicles || [],
      applicableToAll: body.applicableToAll !== undefined ? body.applicableToAll : true,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      status: body.status || 'active',
      autoSendToLeads: body.autoSendToLeads || false,
      autoSendToCustomers: body.autoSendToCustomers || false,
      channels: body.channels || [],
      aiGenerated: false,
      isPaid: body.isPaid || false,
      isFreePromotion: !body.isPaid,
      promotionScope: body.promotionScope || 'dealer',
      vehicleId: body.vehicleId,
      price: body.price || 0,
      duration: body.duration || 30,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      views: body.views || 0,
      clicks: body.clicks || 0,
      priority: body.priority || 100,
      isInternal: true,
      createdByAdmin: true,
      imageUrl: body.imageUrl,
      placement: body.placement || 'promotions_section',
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating internal promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}




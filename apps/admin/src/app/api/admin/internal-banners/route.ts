import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

// Tenant especial para banners internos del admin
const ADMIN_INTERNAL_TENANT_ID = 'system';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener banners internos del sistema
    const bannersSnapshot = await db
      .collection('tenants')
      .doc(ADMIN_INTERNAL_TENANT_ID)
      .collection('premium_banners')
      .where('isInternal', '==', true)
      .where('createdByAdmin', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const banners = bannersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        expiresAt: data.expiresAt?.toDate()?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
      };
    });

    return NextResponse.json({ banners });
  } catch (error: any) {
    console.error('Error fetching internal banners:', error);
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

    // Crear banner interno
    const bannerRef = db
      .collection('tenants')
      .doc(ADMIN_INTERNAL_TENANT_ID)
      .collection('premium_banners')
      .doc();

    await bannerRef.set({
      tenantId: ADMIN_INTERNAL_TENANT_ID,
      title: body.title,
      description: body.description,
      imageUrl: body.imageUrl,
      ctaText: body.ctaText || 'Ver Más',
      linkType: body.linkType || 'none',
      linkValue: body.linkValue || '',
      status: body.status || 'active',
      placement: body.placement,
      isPaid: body.isPaid || false,
      price: body.price || 0,
      duration: body.duration || 30,
      priority: body.priority || 100,
      views: body.views || 0,
      clicks: body.clicks || 0,
      approved: true, // Auto-aprobado para admin
      isInternal: true,
      createdByAdmin: true,
      expiresAt: body.expiresAt ? admin.firestore.Timestamp.fromDate(new Date(body.expiresAt)) : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    return NextResponse.json(
      {
        banner: {
          id: bannerRef.id,
          ...body,
          approved: true,
          isInternal: true,
          createdByAdmin: true,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating internal banner:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}




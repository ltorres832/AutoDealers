export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getFreePublicListingsSettings } from '@autodealers/core';
import * as admin from 'firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getFreePublicListingsSettings();
    return NextResponse.json(settings);
  } catch (error: unknown) {
    console.error('Error fetching free public listings settings:', error);
    return NextResponse.json({ error: 'Error al cargar configuración' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      enabled,
      maxActiveFreeVehiclesPerSeller,
      durationDays,
      ctaTitle,
      ctaSubtitle,
      ctaButtonLabel,
      quickListingPath,
      registerPath,
      registerCtaLabel,
      successHeadline,
      successSubtitle,
    } = body;

    const sanePath = (v: unknown, def: string) =>
      typeof v === 'string' && v.startsWith('/') ? v : def;

    const db = getFirestore();
    await db
      .collection('system_settings')
      .doc('free_public_listings')
      .set(
        {
          enabled: enabled !== false,
          maxActiveFreeVehiclesPerSeller: Math.max(
            0,
            Math.min(100, Number(maxActiveFreeVehiclesPerSeller) || 0)
          ),
          durationDays: Math.max(1, Math.min(365, Number(durationDays) || 14)),
          ctaTitle: typeof ctaTitle === 'string' ? ctaTitle : '',
          ctaSubtitle: typeof ctaSubtitle === 'string' ? ctaSubtitle : '',
          ctaButtonLabel: typeof ctaButtonLabel === 'string' ? ctaButtonLabel : '',
          quickListingPath: sanePath(quickListingPath, '/publicar-gratis'),
          registerPath: sanePath(registerPath, '/register?type=seller'),
          registerCtaLabel:
            typeof registerCtaLabel === 'string' ? registerCtaLabel : '',
          successHeadline:
            typeof successHeadline === 'string' ? successHeadline : '',
          successSubtitle:
            typeof successSubtitle === 'string' ? successSubtitle : '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: auth.userId,
        },
        { merge: true }
      );

    const settings = await getFreePublicListingsSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    console.error('Error saving free public listings settings:', error);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}

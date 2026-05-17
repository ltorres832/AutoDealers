import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { parsePlatformBrandingFirestoreData } from '@autodealers/shared/platform-branding-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const brandingDoc = await db.collection('admin_settings').doc('branding').get();

    if (brandingDoc.exists) {
      const raw = brandingDoc.data() as Record<string, unknown> | undefined;
      const p = parsePlatformBrandingFirestoreData(raw, raw?.updatedAt);
      return NextResponse.json({
        logo: p.logo,
        favicon: p.favicon,
        companyName: p.companyName,
        adminName: p.adminName,
        adminPhoto: p.adminPhoto || null,
        logoVersion: p.logoVersion,
      });
    }

    const p = parsePlatformBrandingFirestoreData(undefined, undefined);
    return NextResponse.json({
      logo: p.logo,
      favicon: p.favicon,
      companyName: p.companyName,
      adminName: p.adminName,
      adminPhoto: p.adminPhoto || null,
      logoVersion: p.logoVersion,
    });
  } catch (error: unknown) {
    console.error('Error fetching branding:', error);
    return NextResponse.json(
      { error: 'Error al cargar configuración de marca' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { logo, favicon, companyName, adminName, adminPhoto } = body;

    const db = getFirestore();
    await db.collection('admin_settings').doc('branding').set(
      {
        logo: logo || null,
        favicon: favicon || null,
        companyName: companyName || 'AutoDealers',
        adminName: adminName || 'Administrador',
        adminPhoto: adminPhoto || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.userId,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating branding:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración de marca' },
      { status: 500 }
    );
  }
}

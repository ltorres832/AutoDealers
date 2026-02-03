export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getStorage } from '@autodealers/core';
import * as admin from 'firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const brandingDoc = await db.collection('admin_settings').doc('branding').get();
    
    if (brandingDoc.exists) {
      const data = brandingDoc.data();
      return NextResponse.json({
        logo: data?.logo || null,
        companyName: data?.companyName || 'AutoDealers',
        adminName: data?.adminName || 'Administrador',
        adminPhoto: data?.adminPhoto || null,
      });
    }

    return NextResponse.json({
      logo: null,
      companyName: 'AutoDealers',
      adminName: 'Administrador',
      adminPhoto: null,
    });
  } catch (error: any) {
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
    const { logo, companyName, adminName, adminPhoto } = body;

    const db = getFirestore();
    await db.collection('admin_settings').doc('branding').set({
      logo: logo || null,
      companyName: companyName || 'AutoDealers',
      adminName: adminName || 'Administrador',
      adminPhoto: adminPhoto || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.userId,
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating branding:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración de marca' },
      { status: 500 }
    );
  }
}

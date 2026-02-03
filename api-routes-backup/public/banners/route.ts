import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - carga dinámica para evitar error de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getFirestore } = require('@autodealers/core') as any;
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '4');

    // Obtener banners internos del admin (prioridad alta)
    const internalBannersSnapshot = await db
      .collection('tenants')
      .doc('system')
      .collection('premium_banners')
      .where('isInternal', '==', true)
      .where('createdByAdmin', '==', true)
      .where('status', '==', status)
      .orderBy('priority', 'desc')
      .limit(limit)
      .get();

    // Obtener banners premium activos de todos los tenants
    const bannersSnapshot = await db
      .collectionGroup('premium_banners')
      .where('status', '==', status)
      .where('approved', '==', true)
      .orderBy('priority', 'asc')
      .limit(limit)
      .get();

    // Combinar banners internos primero (mayor prioridad) y luego otros
    const allBannersDocs = [...internalBannersSnapshot.docs, ...bannersSnapshot.docs];
    
    const banners = allBannersDocs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        tenantId: data.tenantId || 'system', // Para banners internos
        expiresAt: data.expiresAt?.toDate()?.toISOString(),
        createdAt: data.createdAt?.toDate()?.toISOString(),
      };
    });

    // Filtrar banners expirados
    const now = new Date();
    const activeBanners = banners.filter((banner: any) => {
      if (!banner.expiresAt) return true;
      return new Date(banner.expiresAt) > now;
    });

    return NextResponse.json({ banners: activeBanners });
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



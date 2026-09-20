import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/shared';
import {
  expireFeaturedPromotions,
  getFeaturedConfig,
  listActiveFeaturedPromotions,
  listFeaturedPromotionsHistory,
  listPendingFeaturedRequests,
  saveFeaturedConfig,
} from '@autodealers/core/featured-promotions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Nunca bloquear la página por un fallo en expirar/listar activos.
  await expireFeaturedPromotions().catch((e) => {
    console.error('[featured-promotions] expire error:', e);
    return 0;
  });

  let config;
  try {
    config = await getFeaturedConfig();
  } catch (e) {
    console.error('[featured-promotions] getFeaturedConfig error:', e);
    return NextResponse.json(
      { error: 'No se pudo cargar la configuración de destacados.' },
      { status: 500 }
    );
  }

  const active = await listActiveFeaturedPromotions({ limit: 200 }).catch((e) => {
    console.error('[featured-promotions] listActive error:', e);
    return [];
  });

  const history = await listFeaturedPromotionsHistory({ limit: 300 }).catch((e) => {
    console.error('[featured-promotions] history error:', e);
    return [];
  });

  const pending = await listPendingFeaturedRequests({ limit: 100 }).catch((e) => {
    console.error('[featured-promotions] pending error:', e);
    return [];
  });

  return NextResponse.json({ config, active, history, pending });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const body = await request.json();
  const config = await saveFeaturedConfig(body.config);
  return NextResponse.json({ success: true, config });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id, status } = await request.json();
  if (!id || !['active', 'expired', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  await getFirestore().collection('featured_promotions').doc(id).set(
    {
      status,
      updatedAt: new Date(),
    },
    { merge: true }
  );
  return NextResponse.json({ success: true });
}

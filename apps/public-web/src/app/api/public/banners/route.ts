import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase-admin';
import { isDemoPromoAccount, tenantIdFromResourcePath } from '@/lib/public-catalog-visibility';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidar cada 5 minutos

function serializeBanner(doc: { id: string; data: () => Record<string, unknown>; ref?: { path?: string } }) {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: data.tenantId || tenantIdFromResourcePath(doc.ref?.path),
    ...data,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString(),
    startDate: (data.startDate as { toDate?: () => Date })?.toDate?.()?.toISOString(),
    endDate: (data.endDate as { toDate?: () => Date })?.toDate?.()?.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const placement = searchParams.get('placement');
    const limit = parseInt(searchParams.get('limit') || '10');

    let snapshot;
    let banners: any[] = [];

    // Traer de más cuando hay placement: el límite se aplica DESPUÉS de filtrar
    // (si no, vehicle_page/video quedan fuera porque solo sobrevivían hero/sidebar).
    const queryLimit = placement ? Math.max(limit * 20, 200) : Math.max(limit, 10);

    try {
      if (placement) {
        try {
          snapshot = await db
            .collectionGroup('premium_banners')
            .where('status', '==', status)
            .where('placement', '==', placement)
            .limit(queryLimit)
            .get();
          banners = snapshot.docs.map(serializeBanner);
        } catch {
          snapshot = undefined;
          banners = [];
        }
      }

      if (!placement || !snapshot) {
        // Intentar consulta con orderBy
        const query: any = db.collectionGroup('premium_banners')
          .where('status', '==', status)
          .orderBy('createdAt', 'desc')
          .limit(queryLimit);

        snapshot = await query.get();
        banners = snapshot.docs.map(serializeBanner);
      }
    } catch (queryError: any) {
      // Si falla por falta de índice, usar fallback
      const isIndexError = queryError.code === 9 ||
        queryError.message?.includes('index') ||
        queryError.details?.includes('index') ||
        queryError.message?.includes('FAILED_PRECONDITION');

      if (isIndexError) {
        console.warn('⚠️ Consulta de banners falló por falta de índice, usando fallback...');

        try {
          // Fallback 1: solo filtrar por status, luego ordenar en memoria
          snapshot = await db.collectionGroup('premium_banners')
            .where('status', '==', status)
            .get();

          banners = snapshot.docs.map(serializeBanner);

          // Ordenar en memoria por createdAt (más recientes primero)
          banners = banners.sort((a: any, b: any) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          banners = banners.slice(0, queryLimit);
        } catch (fallbackError: any) {
          // Fallback 2: obtener TODOS los banners y filtrar en memoria
          const isFallbackIndexError = fallbackError.code === 9 ||
            fallbackError.message?.includes('index') ||
            fallbackError.details?.includes('index');

          if (isFallbackIndexError) {
            console.warn('⚠️ Fallback 1 también falló, usando fallback 2 (obtener todos y filtrar en memoria)...');

            try {
              snapshot = await db.collectionGroup('premium_banners').get();

              banners = snapshot.docs.map(serializeBanner);

              // Filtrar por status en memoria
              banners = banners.filter((banner: any) => banner.status === status);

              // Ordenar en memoria por createdAt (más recientes primero)
              banners = banners.sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
              });

              banners = banners.slice(0, queryLimit);
            } catch (finalError: any) {
              console.error('❌ Fallback 2 también falló:', finalError.message);
              banners = [];
            }
          } else {
            // Si no es error de índice en el fallback, lanzar el error
            throw fallbackError;
          }
        }
      } else {
        // Si no es error de índice, lanzar el error original
        throw queryError;
      }
    }

    banners = banners.filter((banner: any) => {
      const pathTenantId = tenantIdFromResourcePath(banner?.path || banner?.__path || '');
      return !isDemoPromoAccount(banner as Record<string, unknown>, banner.tenantId || pathTenantId || banner.id);
    });

    if (placement) {
      banners = banners.filter((banner: any) => banner.placement === placement);
    }

    banners = banners.slice(0, limit);

    return NextResponse.json({ banners }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidar cada 5 minutos

export async function GET(request: NextRequest) {
  try {
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '10');

    let snapshot;
    let banners: any[];

    try {
      // Intentar consulta con orderBy
      let query: any = db.collectionGroup('premium_banners')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      snapshot = await query.get();
      banners = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString(),
          startDate: data.startDate?.toDate()?.toISOString(),
          endDate: data.endDate?.toDate()?.toISOString(),
        };
      });
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

          banners = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate()?.toISOString(),
              startDate: data.startDate?.toDate()?.toISOString(),
              endDate: data.endDate?.toDate()?.toISOString(),
            };
          });

          // Ordenar en memoria por createdAt (más recientes primero)
          banners = banners.sort((a: any, b: any) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          // Limitar después de ordenar
          banners = banners.slice(0, limit);
        } catch (fallbackError: any) {
          // Fallback 2: obtener TODOS los banners y filtrar en memoria
          const isFallbackIndexError = fallbackError.code === 9 || 
                                       fallbackError.message?.includes('index') || 
                                       fallbackError.details?.includes('index');
          
          if (isFallbackIndexError) {
            console.warn('⚠️ Fallback 1 también falló, usando fallback 2 (obtener todos y filtrar en memoria)...');
            
            try {
              snapshot = await db.collectionGroup('premium_banners').get();
              
              banners = snapshot.docs.map((doc: any) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate()?.toISOString(),
                  startDate: data.startDate?.toDate()?.toISOString(),
                  endDate: data.endDate?.toDate()?.toISOString(),
                };
              });

              // Filtrar por status en memoria
              banners = banners.filter((banner: any) => banner.status === status);

              // Ordenar en memoria por createdAt (más recientes primero)
              banners = banners.sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
              });

              // Limitar después de ordenar
              banners = banners.slice(0, limit);
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


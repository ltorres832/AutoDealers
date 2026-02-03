import { NextRequest, NextResponse } from 'next/server';
import { getActivePromotions } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const tenantId = searchParams.get('tenantId'); // Opcional: filtrar por tenant específico

    let allPromotions: any[] = [];

    if (tenantId) {
      // Si hay tenantId, obtener promociones solo de ese tenant
      const promotions = await getActivePromotions(tenantId);
      allPromotions = promotions;
    } else {
      // OPTIMIZADO: Si no hay tenantId, obtener promociones de todos los tenants activos en paralelo
      const tenantsSnapshot = await db
        .collection('tenants')
        .where('status', '==', 'active')
        .limit(20) // Limitar tenants para mejorar rendimiento
        .get();

      // Hacer todas las consultas en paralelo con timeout
      const promotionPromises = tenantsSnapshot.docs.map(async (tenantDoc: any) => {
        const tId = tenantDoc.id;
        try {
          const timeoutPromise = new Promise<any[]>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 3000);
          });

          const promotionsPromise = getActivePromotions(tId);
          const promotions = await Promise.race([promotionsPromise, timeoutPromise]) as any[];
          return promotions;
        } catch (error: any) {
          // Si es error de índice o timeout, retornar array vacío
          if (error.code === 9 || 
              error.message?.includes('index') || 
              error.message?.includes('Timeout') ||
              error.details?.includes('index')) {
            return [];
          }
          console.error(`Error fetching promotions for tenant ${tId}:`, error);
          return [];
        }
      });

      // Esperar todas las consultas en paralelo con timeout total
      const allPromotionsArrays = await Promise.race([
        Promise.all(promotionPromises),
        new Promise<any[][]>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout total')), 8000);
        })
      ]).catch(() => {
        // Retornar resultados parciales si hay timeout
        return Promise.allSettled(promotionPromises).then(results => 
          results
            .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
            .map(r => r.value)
        );
      });

      allPromotions = (allPromotionsArrays || []).flat();
    }

    // Ordenar por fecha de inicio (más recientes primero) y limitar
    const sortedPromotions = allPromotions
      .sort((a: any, b: any) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);

    return NextResponse.json({ promotions: sortedPromotions }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('Error fetching promotions:', error);
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


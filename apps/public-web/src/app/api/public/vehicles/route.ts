import { NextRequest, NextResponse } from 'next/server';
import { getVehicles } from '@autodealers/inventory';
import { getFirestore } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache for real-time updates

export async function GET(request: NextRequest) {
  try {
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'available';
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const year = searchParams.get('year');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Si no hay tenantId específico, buscar en todos los tenants activos
    // Obtener todos los tenants activos
    const tenantsSnapshot = await db
      .collection('tenants')
      .where('status', '==', 'active')
      .limit(50) // Limitar a 50 tenants máximo para evitar timeouts
      .get();

    console.log(`🔍 Encontrados ${tenantsSnapshot.docs.length} tenants activos`);

    // Buscar vehículos en paralelo para todos los tenants (más rápido)
    const vehiclePromises = tenantsSnapshot.docs.map(async (tenantDoc: any) => {
      const tenantId = tenantDoc.id;

      try {
        // Agregar timeout individual de 5 segundos por tenant
        const timeoutPromise = new Promise<any[]>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout para tenant ${tenantId}`)), 5000);
        });

        const vehiclesPromise = getVehicles(tenantId, {
          status: status as any,
          make: make || undefined,
          model: model || undefined,
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
          limit: 50, // Límite por tenant para evitar respuestas muy grandes
        } as any);

        const vehicles = await Promise.race([vehiclesPromise, timeoutPromise]) as any[];

        // Relaxed filter: Allow vehicles explicitly published OR if the flag is missing but they are available
        // This ensures new cars show up even if the Admin UI input for 'publishedOnPublicPage' was missed
        const publishedVehicles = vehicles.filter((v: any) => {
          const isPublished = v.publishedOnPublicPage === true;
          const isAvailable = v.status === 'available';
          // Si tiene el flag explícito, respetarlo. Si no tiene el flag, asumir público si está 'available'
          return isPublished || (v.publishedOnPublicPage === undefined && isAvailable);
        });

        return publishedVehicles;
      } catch (error: any) {
        // Si es timeout o error de índice, retornar array vacío
        if (error.message?.includes('Timeout') ||
          error.code === 9 ||
          error.message?.includes('index') ||
          error.details?.includes('index')) {
          console.warn(`⚠️ Tenant ${tenantId} omitido: ${error.message}`);
          return [];
        }
        console.error(`Error fetching vehicles for tenant ${tenantId}:`, error.message);
        return [];
      }
    });

    // Esperar todas las consultas en paralelo con timeout total de 10 segundos
    const allVehiclesArrays = await Promise.race([
      Promise.all(vehiclePromises),
      new Promise<any[][]>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout total')), 10000);
      })
    ]).catch((error) => {
      console.warn(`⚠️ Timeout parcial, usando resultados disponibles: ${error.message}`);
      // Retornar resultados parciales si hay timeout
      return Promise.allSettled(vehiclePromises).then(results =>
        results
          .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
          .map(r => r.value)
      );
    });

    const allVehicles = (allVehiclesArrays || []).flat();
    console.log(`✅ Total de vehículos encontrados: ${allVehicles.length}`);

    // Ordenar por fecha de creación (más recientes primero) y limitar
    const sortedVehicles = allVehicles
      .sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);

    console.log(`\n🎯 TOTAL: ${sortedVehicles.length} vehículos publicados encontrados\n`);

    return NextResponse.json({ vehicles: sortedVehicles }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


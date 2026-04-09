import { NextRequest, NextResponse } from 'next/server';
import { getVehicles } from '@autodealers/inventory';
import { getFirestore } from '../../../../lib/firebase-admin';
import { normalizeVehiclesArray } from '@/lib/vehicle-photos-normalize';
import {
  isTenantEligibleForPublicCatalog,
  isVehicleVisibleOnPublicListing,
} from '@/lib/public-catalog-visibility';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache for real-time updates

export async function GET(request: NextRequest) {
  try {
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const year = searchParams.get('year');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Incluir tenants sin campo status (antes solo status===active devolvía 0)
    const tenantsSnapshot = await db.collection('tenants').get();
    const tenantDocs = tenantsSnapshot.docs.filter((d) =>
      isTenantEligibleForPublicCatalog(d.data() as Record<string, unknown>)
    );

    console.log(`🔍 Tenants elegibles para catálogo: ${tenantDocs.length} (de ${tenantsSnapshot.size} docs)`);

    // Buscar vehículos en paralelo para todos los tenants (más rápido)
    const vehiclePromises = tenantDocs.map(async (tenantDoc: any) => {
      const tenantId = tenantDoc.id;

      try {
        // Agregar timeout individual de 5 segundos por tenant
        const timeoutPromise = new Promise<any[]>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout para tenant ${tenantId}`)), 45000);
        });

        const y = year ? parseInt(year, 10) : NaN;
        const vehiclesPromise = getVehicles(tenantId, {
          // Sin status en Firestore: muchos docs usan disponible/in_stock; filtramos en memoria
          prefetchCap: 220,
          make: make || undefined,
          model: model || undefined,
          minYear: !Number.isNaN(y) ? y : undefined,
          maxYear: !Number.isNaN(y) ? y : undefined,
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
          limit: 50,
        } as any);

        const vehicles = await Promise.race([vehiclesPromise, timeoutPromise]) as any[];

        const publishedVehicles = vehicles.filter((v: any) =>
          isVehicleVisibleOnPublicListing(v)
        );

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

    const settled = await Promise.allSettled(vehiclePromises);
    const allVehiclesArrays = settled
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .map((r) => r.value);

    const allVehicles = (allVehiclesArrays || []).flat();
    console.log(`✅ Total de vehículos encontrados: ${allVehicles.length}`);

    const normalizedVehicles = normalizeVehiclesArray(
      allVehicles.map((v: any) => ({ ...v } as Record<string, unknown>))
    );

    // Ordenar por fecha de creación (más recientes primero) y limitar
    const sortedVehicles = normalizedVehicles
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


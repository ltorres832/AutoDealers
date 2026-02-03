import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { getVehicles } from '@autodealers/inventory';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidar cada 60 segundos

export async function GET(request: NextRequest) {
  try {
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '*';
    const type = searchParams.get('type') as 'vehicles' | 'dealers' | 'sellers' | 'all' | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    const results: any = {
      vehicles: [],
      dealers: [],
      sellers: [],
    };

    // Buscar vehículos - OPTIMIZADO: consultas en paralelo
    if (!type || type === 'vehicles' || type === 'all') {
      const tenantsSnapshot = await db
        .collection('tenants')
        .where('status', '==', 'active')
        .limit(20) // Limitar tenants para mejorar rendimiento
        .get();

      // Hacer todas las consultas en paralelo con timeout
      const vehiclePromises = tenantsSnapshot.docs.map(async (tenantDoc: any) => {
        const tenantId = tenantDoc.id;
        try {
          const timeoutPromise = new Promise<any[]>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 3000);
          });

          const vehiclesPromise = getVehicles(tenantId, {
            status: 'available',
          });

          const vehicles = await Promise.race([vehiclesPromise, timeoutPromise]) as any[];

          // Filtrar solo vehículos publicados en página pública
          const publishedVehicles = vehicles.filter((v: any) => 
            v.publishedOnPublicPage === true
          );

          // Filtrar por término de búsqueda si no es '*'
          let filteredVehicles = publishedVehicles;
          if (q && q !== '*') {
            const searchTerm = q.toLowerCase();
            filteredVehicles = publishedVehicles.filter((v: any) => {
              const make = (v.make || '').toLowerCase();
              const model = (v.model || '').toLowerCase();
              const year = (v.year || '').toString();
              const description = (v.description || '').toLowerCase();
              
              return make.includes(searchTerm) ||
                     model.includes(searchTerm) ||
                     year.includes(searchTerm) ||
                     description.includes(searchTerm);
            });
          }

          return filteredVehicles;
        } catch (error) {
          console.error(`Error searching vehicles for tenant ${tenantId}:`, error);
          return [];
        }
      });

      // Esperar todas las consultas en paralelo con timeout total
      const allVehiclesArrays = await Promise.race([
        Promise.all(vehiclePromises),
        new Promise<any[][]>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout total')), 8000);
        })
      ]).catch(() => {
        // Retornar resultados parciales si hay timeout
        return Promise.allSettled(vehiclePromises).then(results => 
          results
            .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
            .map(r => r.value)
        );
      });

      const allVehicles = (allVehiclesArrays || []).flat();
      results.vehicles = allVehicles.slice(0, limit);
    }

    // Buscar dealers
    if (!type || type === 'dealers' || type === 'all') {
      let dealersQuery: any = db.collection('users')
        .where('role', '==', 'dealer')
        .where('status', '==', 'active');

      const dealersSnapshot = await dealersQuery.limit(limit * 2).get(); // Aumentar límite
      console.log(`Found ${dealersSnapshot.size} dealers`);

      let dealers = dealersSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          tenantId: data.tenantId || '',
        };
      });

      // Filtrar por término de búsqueda si no es '*'
      if (q && q !== '*') {
        const searchTerm = q.toLowerCase();
        dealers = dealers.filter((d: any) => {
          const name = (d.name || '').toLowerCase();
          return name.includes(searchTerm);
        });
      }

      // OPTIMIZADO: Obtener información del tenant en batch y reducir consultas
      const tenantIds = [...new Set(dealers.map((d: any) => d.tenantId).filter(Boolean))] as string[];
      
      // Obtener todos los tenants en paralelo
      const tenantDocs = await Promise.all(
        tenantIds.map(id => db.collection('tenants').doc(id).get())
      );
      
      const tenantsMap = new Map();
      tenantDocs.forEach((doc, index) => {
        if (doc.exists) {
          tenantsMap.set(tenantIds[index], doc.data());
        }
      });

      // Obtener ratings de dealers en batch
      const dealerDocs = await Promise.all(
        dealers.map((d: any) => db.collection('users').doc(d.id).get())
      );
      
      const dealerRatingsMap = new Map();
      dealerDocs.forEach((doc, index) => {
        if (doc.exists) {
          const data = doc.data();
          dealerRatingsMap.set(dealers[index].id, {
            rating: data?.dealerRating || 0,
            ratingCount: data?.dealerRatingCount || 0,
          });
        }
      });

      // Obtener conteos de vehículos y sellers en paralelo por tenant
      const tenantStatsPromises = tenantIds.map(async (tenantId: string) => {
        try {
          const [vehiclesSnapshot, sellersSnapshot] = await Promise.all([
            db.collection('tenants').doc(tenantId).collection('vehicles').get(),
            db.collection('users')
              .where('tenantId', '==', tenantId)
              .where('role', '==', 'seller')
              .where('status', '==', 'active')
              .get(),
          ]);

          const availableVehicles = vehiclesSnapshot.docs
            .map((doc: any) => doc.data())
            .filter((vehicle: any) => {
              const isExcluded = vehicle.status === 'sold' || 
                               vehicle.status === 'deleted' || 
                               vehicle.status === 'inactive' ||
                               vehicle.deleted === true;
              return !isExcluded;
            });

          return {
            tenantId,
            vehiclesCount: availableVehicles.length,
            sellersCount: sellersSnapshot.size,
          };
        } catch (error) {
          console.error(`Error fetching stats for tenant ${tenantId}:`, error);
          return { tenantId, vehiclesCount: 0, sellersCount: 0 };
        }
      });

      const tenantStats = await Promise.all(tenantStatsPromises);
      const statsMap = new Map(tenantStats.map(s => [s.tenantId, s]));

      // Combinar toda la información
      const dealersWithTenantInfo = dealers.map((dealer: any) => {
        const tenantData = tenantsMap.get(dealer.tenantId);
        const stats = statsMap.get(dealer.tenantId) || { vehiclesCount: 0, sellersCount: 0 };
        const ratings = dealerRatingsMap.get(dealer.id) || { rating: 0, ratingCount: 0 };

        return {
          ...dealer,
          companyName: tenantData?.name || tenantData?.companyName || dealer.name,
          tenantName: tenantData?.name || '',
          publishedVehiclesCount: stats.vehiclesCount,
          sellersCount: stats.sellersCount,
          dealerRating: ratings.rating,
          dealerRatingCount: ratings.ratingCount,
          location: tenantData?.address || tenantData?.location || '',
        };
      });

      results.dealers = dealersWithTenantInfo;
    }

    // Buscar sellers
    if (!type || type === 'sellers' || type === 'all') {
      let sellersQuery: any = db.collection('users')
        .where('role', '==', 'seller')
        .where('status', '==', 'active');

      const sellersSnapshot = await sellersQuery.limit(limit * 2).get(); // Más sellers que dealers
      console.log(`Found ${sellersSnapshot.size} sellers`);

      let sellers = sellersSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          title: data.title || data.jobTitle || 'Vendedor',
          photo: data.photo || data.photoUrl || '',
          email: data.email || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || data.phone || '',
          tenantId: data.tenantId || '',
          sellerRating: data.sellerRating || 0,
          sellerRatingCount: data.sellerRatingCount || 0,
        };
      });

      // Filtrar por término de búsqueda si no es '*'
      if (q && q !== '*') {
        const searchTerm = q.toLowerCase();
        sellers = sellers.filter((s: any) => {
          const name = (s.name || '').toLowerCase();
          const title = (s.title || '').toLowerCase();
          return name.includes(searchTerm) || title.includes(searchTerm);
        });
      }

      // OPTIMIZADO: Obtener información del tenant y vehículos en batch
      const sellerTenantIds = [...new Set(sellers.map((s: any) => s.tenantId).filter(Boolean))] as string[];
      
      // Obtener todos los tenants en paralelo
      const sellerTenantDocs = await Promise.all(
        sellerTenantIds.map(id => db.collection('tenants').doc(id).get())
      );
      
      const sellerTenantsMap = new Map();
      sellerTenantDocs.forEach((doc, index) => {
        if (doc.exists) {
          sellerTenantsMap.set(sellerTenantIds[index], doc.data());
        }
      });

      // Obtener vehículos por tenant en paralelo
      const vehiclesByTenantPromises = sellerTenantIds.map(async (tenantId: string) => {
        try {
          const vehiclesSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .get();
          
          return {
            tenantId,
            vehicles: vehiclesSnapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data(),
            })),
          };
        } catch (error) {
          console.error(`Error fetching vehicles for tenant ${tenantId}:`, error);
          return { tenantId, vehicles: [] };
        }
      });

      const vehiclesByTenant = await Promise.all(vehiclesByTenantPromises);
      const vehiclesMap = new Map(vehiclesByTenant.map(v => [v.tenantId, v.vehicles]));

      // Combinar información para cada seller
      const sellersWithInfo = sellers.map((seller: any) => {
        const tenantData = sellerTenantsMap.get(seller.tenantId);
        const tenantVehicles = vehiclesMap.get(seller.tenantId) || [];

        // Filtrar vehículos del seller
        const sellerVehicles = tenantVehicles.filter((vehicle: any) => {
          const belongsToSeller = vehicle.sellerId === seller.id || 
                                 (vehicle.assignedTo === seller.id && !vehicle.sellerId);
          const isExcluded = vehicle.status === 'sold' || 
                           vehicle.status === 'deleted' || 
                           vehicle.status === 'inactive' ||
                           vehicle.deleted === true;
          return belongsToSeller && !isExcluded;
        });

        const vehiclesWithAnySellerId = tenantVehicles.filter((v: any) => v.sellerId);

        let publishedVehiclesCount = 0;
        if (sellerVehicles.length > 0) {
          publishedVehiclesCount = sellerVehicles.length;
        } else if (vehiclesWithAnySellerId.length > 0) {
          publishedVehiclesCount = 0;
        } else {
          publishedVehiclesCount = tenantVehicles.filter((v: any) => {
            const isExcluded = v.status === 'sold' || v.status === 'deleted' || v.status === 'inactive' || v.deleted === true;
            return !isExcluded;
          }).length;
        }

        return {
          ...seller,
          tenantName: tenantData?.name || '',
          publishedVehiclesCount,
        };
      });

      results.sellers = sellersWithInfo;
    }

    return NextResponse.json({
      query: q,
      type: type || 'all',
      results,
      total: {
        vehicles: results.vehicles.length,
        dealers: results.dealers.length,
        sellers: results.sellers.length,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


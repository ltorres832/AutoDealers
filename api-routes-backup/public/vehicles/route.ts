import { NextRequest, NextResponse } from 'next/server';

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'available';

    console.log('🔍 GET /api/public/vehicles - Buscando vehículos públicos con:', { status });
    
    // Verificar que Firebase esté inicializado
    if (!db) {
      console.error('❌ Firestore no está disponible');
      return NextResponse.json(
        { error: 'Database not available', details: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    // Obtener solo vehículos publicados en la página pública
    // Primero buscar por status, luego filtrar por publishedOnPublicPage en memoria
    // Esto evita problemas con índices compuestos en collectionGroup
    let vehiclesSnapshot;
    try {
      vehiclesSnapshot = await db
        .collectionGroup('vehicles')
        .where('status', '==', status)
        .limit(1000) // Aumentar límite para luego filtrar
        .get();
      
      console.log(`📊 Encontrados ${vehiclesSnapshot.size} vehículos con status '${status}'`);
    } catch (error: any) {
      // Si falla la consulta con collectionGroup, intentar sin filtro de status
      console.warn('⚠️ Error con collectionGroup, intentando método alternativo:', error.message);
      vehiclesSnapshot = await db
        .collectionGroup('vehicles')
        .limit(1000)
        .get();
    }

    const vehicles = [];
    const tenantCache: Record<string, { 
      name: string; 
      sellerId: string | null;
      sellerRating: number;
      sellerRatingCount: number;
    }> = {};

    for (const doc of vehiclesSnapshot.docs) {
      const data = doc.data();
      
      // Filtrar por publishedOnPublicPage en memoria
      // Aceptar tanto true explícito como el campo presente (para compatibilidad)
      const isPublished = data.publishedOnPublicPage === true || data.publishedOnPublicPage === 'true';
      
      if (!isPublished) {
        continue; // Saltar vehículos no publicados
      }

      // También verificar que el status sea el correcto (por si la consulta falló)
      if (data.status !== status) {
        continue;
      }
      
      // Obtener tenantId del path
      const pathParts = doc.ref.path.split('/');
      const tenantId = pathParts[1];

      if (!tenantId) {
        console.warn('⚠️ No se pudo obtener tenantId del path:', doc.ref.path);
        continue;
      }

      // Obtener nombre del tenant y sellerId (con cache)
      let tenantInfo = tenantCache[tenantId];
      if (!tenantInfo) {
        let tenantName = 'Concesionario';
        let sellerId: string | null = null;
        
        try {
          const tenantDoc = await db.collection('tenants').doc(tenantId).get();
          if (tenantDoc.exists) {
            tenantName = tenantDoc.data()?.name || 'Concesionario';
          }
        } catch (error) {
          console.warn('Error obteniendo tenant:', error);
        }

        // Buscar el seller asociado al tenant
        // Un tenant puede tener múltiples sellers, tomamos el primero activo
        let sellerRating = 0;
        let sellerRatingCount = 0;
        
        try {
          const sellersSnapshot = await db
            .collection('users')
            .where('tenantId', '==', tenantId)
            .where('role', '==', 'seller')
            .where('status', '==', 'active')
            .limit(1)
            .get();
          
          if (!sellersSnapshot.empty) {
            const sellerDoc = sellersSnapshot.docs[0];
            sellerId = sellerDoc.id;
            const sellerData = sellerDoc.data();
            sellerRating = sellerData.sellerRating || 0;
            sellerRatingCount = sellerData.sellerRatingCount || 0;
          }
        } catch (error) {
          console.warn('⚠️ Error buscando seller para tenant:', tenantId, error);
        }

        tenantInfo = { 
          name: tenantName, 
          sellerId,
          sellerRating,
          sellerRatingCount
        };
        tenantCache[tenantId] = tenantInfo;
      }

      // Obtener fotos - solo limpiar, no filtrar tan estrictamente
      const allPhotos = data.photos || [];
      const validPhotos = allPhotos
        .filter((photo: any) => {
          if (!photo) return false;
          if (typeof photo !== 'string') return false;
          const trimmed = photo.trim();
          return trimmed !== '' && trimmed !== 'undefined' && !trimmed.toLowerCase().includes('undefined');
        })
        .map((photo: string) => photo.trim());

      // Logging detallado para debugging
      console.log(`📸 Vehículo ${doc.id} (${data.make} ${data.model}):`, {
        vehicleId: doc.id,
        tenantId,
        allPhotosCount: allPhotos.length,
        validPhotosCount: validPhotos.length,
        allPhotos: allPhotos.slice(0, 3), // Primeras 3 para no saturar
        validPhotos: validPhotos.slice(0, 3),
        photosType: typeof data.photos,
        photosIsArray: Array.isArray(data.photos),
        stockNumber: data.stockNumber || data.specifications?.stockNumber || 'NO TIENE',
        publishedOnPublicPage: data.publishedOnPublicPage,
        status: data.status,
      });

      if (allPhotos.length > 0 && validPhotos.length === 0) {
        console.warn('⚠️ Vehículo tiene fotos pero ninguna es válida:', {
          vehicleId: doc.id,
          make: data.make,
          model: data.model,
          allPhotos,
          validPhotos,
        });
      }

      if (validPhotos.length > 0) {
        console.log('✅ Vehículo con fotos válidas:', {
          vehicleId: doc.id,
          make: data.make,
          model: data.model,
          photosCount: validPhotos.length,
          firstPhoto: validPhotos[0],
        });
      } else if (allPhotos.length === 0) {
        console.warn('⚠️ Vehículo sin fotos:', {
          vehicleId: doc.id,
          make: data.make,
          model: data.model,
        });
      }

      // Obtener stockNumber (puede estar en el nivel superior o en specifications)
      const stockNumber = data.stockNumber || data.specifications?.stockNumber;
      
      // Logging para debug de stockNumber
      if (!stockNumber) {
        console.warn('⚠️ Vehículo sin stockNumber:', {
          vehicleId: doc.id,
          make: data.make,
          model: data.model,
          hasStockNumber: !!data.stockNumber,
          hasSpecsStockNumber: !!data.specifications?.stockNumber,
          specifications: data.specifications,
        });
      } else {
        console.log('✅ Vehículo con stockNumber:', {
          vehicleId: doc.id,
          stockNumber,
          source: data.stockNumber ? 'nivel superior' : 'specifications',
        });
      }
      
      // Logging detallado de fotos
      console.log(`📸 Vehículo ${doc.id} - Fotos:`, {
        vehicleId: doc.id,
        allPhotosCount: allPhotos.length,
        validPhotosCount: validPhotos.length,
        firstPhoto: validPhotos[0] || 'N/A',
        allPhotos: allPhotos.slice(0, 3), // Primeras 3 para no saturar logs
      });
      
      // Obtener bodyType (puede estar en el nivel superior o en specifications)
      const bodyType = data.bodyType || data.specifications?.bodyType;

      vehicles.push({
        id: doc.id,
        tenantId,
        tenantName: tenantInfo.name,
        sellerId: tenantInfo.sellerId, // Agregar sellerId para el link al perfil
        sellerRating: tenantInfo.sellerRating, // Calificación del vendedor
        sellerRatingCount: tenantInfo.sellerRatingCount, // Cantidad de calificaciones
        ...data,
        stockNumber, // Incluir stockNumber en el nivel superior
        bodyType, // Incluir bodyType en el nivel superior
        specifications: {
          ...data.specifications,
          stockNumber, // Asegurar que también esté en specifications
          bodyType, // Asegurar que también esté en specifications
        },
        photos: validPhotos, // Solo incluir fotos válidas
        createdAt: data.createdAt?.toDate()?.toISOString(),
        updatedAt: data.updatedAt?.toDate()?.toISOString(),
      });
    }

    console.log(`✅ Retornando ${vehicles.length} vehículos publicados`);

    return NextResponse.json({ vehicles });
  } catch (error: any) {
    console.error('❌ Error fetching vehicles:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';

// Exportar configuración de runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidar cada 60 segundos

export async function generateStaticParams() {
  return [];
}

// Helper para agregar timeout a promesas
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sellerId } = await params;
    console.log(`🚀 GET /api/public/seller/${sellerId} - Iniciando...`);
    
    if (!sellerId) {
      console.error('❌ No sellerId provided');
      return NextResponse.json({ error: 'ID de vendedor requerido' }, { status: 400 });
    }

    // Obtener Firestore con timeout
    let db;
    try {
      db = await withTimeout(Promise.resolve(getFirestore()), 5000);
    } catch (dbError: any) {
      console.error('❌ Error obteniendo Firestore:', dbError);
      return NextResponse.json(
        { error: 'Error de conexión con la base de datos', details: dbError.message },
        { status: 500 }
      );
    }

    // Obtener información del seller con timeout
    let sellerDoc: any;
    try {
      sellerDoc = await withTimeout(
        db.collection('users').doc(sellerId).get(),
        10000
      );
    } catch (sellerError: any) {
      console.error('❌ Error obteniendo seller:', sellerError);
      return NextResponse.json(
        { error: 'Error al obtener información del vendedor', details: sellerError.message },
        { status: 500 }
      );
    }

    if (!sellerDoc.exists) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const sellerData = sellerDoc.data();
    if (sellerData?.role !== 'seller' || sellerData?.status !== 'active') {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const tenantId = sellerData.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Vendedor no tiene tenant asociado' }, { status: 404 });
    }

    // Obtener información del tenant con timeout
    let tenantDoc;
    try {
      tenantDoc = await withTimeout(
        db.collection('tenants').doc(tenantId).get(),
        10000
      );
    } catch (tenantError: any) {
      console.error('❌ Error obteniendo tenant:', tenantError);
      // Continuar sin tenant data si falla
      tenantDoc = { exists: false, data: () => null } as any;
    }

    const tenantData = tenantDoc.exists ? tenantDoc.data() : null;

    console.log(`📦 Fetching vehicles from tenant ${tenantId}...`);
    
    // Obtener vehículos con timeout y límite
    let allVehiclesSnapshot: any;
    try {
      allVehiclesSnapshot = await withTimeout(
        db
          .collection('tenants')
          .doc(tenantId)
          .collection('vehicles')
          .limit(100) // Reducir límite para respuesta más rápida
          .get(),
        15000 // 15 segundos timeout
      );
      
      console.log(`🔍 Total vehicles in tenant ${tenantId}: ${allVehiclesSnapshot.size}`);
    } catch (vehiclesError: any) {
      console.error('❌ Error fetching vehicles:', vehiclesError);
      // Continuar sin vehículos si hay error
      allVehiclesSnapshot = { docs: [], size: 0 } as any;
    }

    console.log(`👤 Looking for vehicles with sellerId=${sellerId}`);

    // Mapear todos los vehículos de forma segura
    const allVehicles = allVehiclesSnapshot.docs.map((doc: any) => {
      try {
        const data = doc.data();
        const vehicle = {
          id: doc.id,
          ...data,
          // Asegurar que las fechas se conviertan correctamente
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
          soldAt: data.soldAt?.toDate?.() || data.soldAt || undefined,
        };
        
        // Log detallado de cada vehículo para debugging
        console.log(`🚗 Vehicle ${doc.id}:`, {
          make: vehicle.make,
          model: vehicle.model,
          status: vehicle.status,
          sellerId: vehicle.sellerId || 'NO ASIGNADO',
          assignedTo: vehicle.assignedTo || 'NO ASIGNADO',
          deleted: vehicle.deleted,
        });
        
        return vehicle;
      } catch (mapError: any) {
        console.error(`❌ Error mapping vehicle ${doc.id}:`, mapError);
        return null;
      }
    }).filter((v: any) => v !== null);
    
    console.log(`📊 Total vehicles mapped: ${allVehicles.length} of ${allVehiclesSnapshot.size}`);

    // PRIMERO: Buscar vehículos que pertenecen específicamente a este seller
    let vehicles = allVehicles.filter((vehicle: any) => {
      if (!vehicle) return false;
      
      // Verificar si el vehículo pertenece al seller
      const hasSellerId = vehicle.sellerId === sellerId;
      const hasAssignedTo = vehicle.assignedTo === sellerId;
      const belongsToSeller = hasSellerId || hasAssignedTo;
      
      // Verificar si está excluido
      const isExcluded = vehicle.status === 'sold' || 
                        vehicle.status === 'deleted' || 
                        vehicle.status === 'inactive' ||
                        vehicle.deleted === true;
      
      return belongsToSeller && !isExcluded;
    });

    console.log(`✅ Found ${vehicles.length} vehicles with sellerId=${sellerId} or assignedTo=${sellerId}`);
    
    // Log detallado de vehículos encontrados
    if (vehicles.length > 0) {
      console.log(`📋 Vehicles found:`, vehicles.map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        sellerId: v.sellerId,
        assignedTo: v.assignedTo,
        status: v.status,
      })));
    } else {
      // Si no hay vehículos con sellerId específico, verificar si hay vehículos con sellerId en el tenant
      const vehiclesWithAnySellerId = allVehicles.filter((v: any) => v.sellerId);
      
      if (vehiclesWithAnySellerId.length > 0) {
        // Hay vehículos con sellerId pero ninguno de este seller - NO mostrar todos
        console.log(`⚠️ Hay ${vehiclesWithAnySellerId.length} vehículos con sellerId en el tenant, pero ninguno pertenece a este seller`);
        vehicles = []; // No mostrar vehículos si hay sellerId pero ninguno es de este seller
      } else {
        // No hay ningún vehículo con sellerId - mostrar todos los disponibles del tenant
        console.log(`📦 No hay vehículos con sellerId asignado, showing all available vehicles from tenant`);
        
        // Filtrar vehículos excluidos con logging detallado
        const excludedVehicles: any[] = [];
        vehicles = allVehicles.filter((vehicle: any) => {
          if (!vehicle) {
            excludedVehicles.push({ id: 'null', reason: 'vehicle is null' });
            return false;
          }
          
          const isSold = vehicle.status === 'sold';
          const isDeleted = vehicle.status === 'deleted';
          const isInactive = vehicle.status === 'inactive';
          const hasDeletedFlag = vehicle.deleted === true;
          
          const isExcluded = isSold || isDeleted || isInactive || hasDeletedFlag;
          
          if (isExcluded) {
            excludedVehicles.push({
              id: vehicle.id,
              make: vehicle.make,
              model: vehicle.model,
              status: vehicle.status,
              deleted: vehicle.deleted,
              reasons: {
                isSold,
                isDeleted,
                isInactive,
                hasDeletedFlag,
              },
            });
          }
          
          return !isExcluded;
        });
        
        console.log(`📦 Showing ${vehicles.length} total available vehicles from tenant`);
        if (excludedVehicles.length > 0) {
          console.log(`🚫 Excluded ${excludedVehicles.length} vehicles:`, excludedVehicles);
        }
      }
    }
    
    // Log de muestra
    if (vehicles.length > 0) {
      console.log(`📝 Sample vehicles (first 3):`, vehicles.slice(0, 3).map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        status: v.status,
        sellerId: v.sellerId || 'NO ASIGNADO',
        assignedTo: v.assignedTo || 'NO ASIGNADO',
        price: v.price,
      })));
    } else {
      console.log(`⚠️ NO HAY VEHÍCULOS disponibles para el seller ${sellerId} en el tenant ${tenantId}`);
    }
    
    console.log(`✅ Preparing response with ${vehicles.length} vehicles`);

    const responseData = {
      seller: {
        id: sellerDoc.id,
        name: sellerData.name || 'Vendedor',
        title: sellerData.title || sellerData.jobTitle || 'Vendedor',
        photo: sellerData.photo || sellerData.photoUrl || '',
        sellerRating: sellerData.sellerRating || 0,
        sellerRatingCount: sellerData.sellerRatingCount || 0,
        email: sellerData.email || '',
        phone: sellerData.phone || '',
        whatsapp: sellerData.whatsapp || sellerData.phone || '',
        website: sellerData.website || tenantData?.website || tenantData?.domain || '',
        tenantId: tenantId,
        tenantName: tenantData?.name || 'Dealer',
      },
      vehicles: vehicles || [],
    };
    
    console.log(`✅ Response ready: seller=${responseData.seller.name}, vehicles=${responseData.vehicles.length}`);
    
    const jsonResponse = NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
    
    console.log(`✅ Sending response with ${responseData.vehicles.length} vehicles`);
    return jsonResponse;
  } catch (error: any) {
    console.error('❌ Error fetching seller data:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    // Intentar devolver una respuesta de error válida
    try {
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          details: error.message || 'Error desconocido',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    } catch (responseError: any) {
      // Si incluso crear la respuesta falla, devolver texto plano
      console.error('❌ Error creando respuesta de error:', responseError);
      return new NextResponse(
        JSON.stringify({ error: 'Error interno del servidor' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }
}


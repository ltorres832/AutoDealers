import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getVehicles, createVehicle } from '@autodealers/inventory';
import { createNotification } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Si hay query param 'id', obtener solo ese vehículo
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');
    
    if (vehicleId) {
      // Obtener vehículo específico
      const { getFirestore } = await import('@autodealers/core');
      const db = getFirestore();
      
      // Buscar en el tenant actual
      let vehicleDoc = await db
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('vehicles')
        .doc(vehicleId)
        .get();
      
      // Si no se encuentra, buscar en el dealer
      if (!vehicleDoc.exists && auth.dealerId) {
        vehicleDoc = await db
          .collection('tenants')
          .doc(auth.dealerId)
          .collection('vehicles')
          .doc(vehicleId)
          .get();
      }
      
      // Si aún no se encuentra, buscar en dealers asociados
      if (!vehicleDoc.exists) {
        const userDoc = await db.collection('users').doc(auth.userId).get();
        const userData = userDoc.data();
        
        if (userData?.associatedDealers && Array.isArray(userData.associatedDealers)) {
          for (const dealerId of userData.associatedDealers) {
            vehicleDoc = await db
              .collection('tenants')
              .doc(dealerId)
              .collection('vehicles')
              .doc(vehicleId)
              .get();
            if (vehicleDoc.exists) break;
          }
        }
      }
      
      if (!vehicleDoc.exists) {
        return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
      }
      
      const vehicleData = vehicleDoc.data();
      return NextResponse.json({
        vehicle: {
          id: vehicleDoc.id,
          ...vehicleData,
          createdAt: vehicleData?.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          updatedAt: vehicleData?.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
          soldAt: vehicleData?.soldAt?.toDate()?.toISOString(),
        },
      });
    }

    // Si no hay 'id', obtener todos los vehículos
    // Si el seller tiene dealerId, obtener vehículos del dealer también
    let allVehicles = await getVehicles(auth.tenantId);

    if (auth.dealerId) {
      // Obtener vehículos del dealer
      const dealerVehicles = await getVehicles(auth.dealerId);
      allVehicles = [...allVehicles, ...dealerVehicles];
    }

    // Si el seller tiene múltiples dealers (verificar en user data)
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(auth.userId).get();
    const userData = userDoc.data();
    
    // Si hay dealers adicionales asociados
    if (userData?.associatedDealers && Array.isArray(userData.associatedDealers)) {
      for (const dealerId of userData.associatedDealers) {
        const dealerVehicles = await getVehicles(dealerId);
        allVehicles = [...allVehicles, ...dealerVehicles];
      }
    }

    // Eliminar duplicados por ID
    const uniqueVehicles = Array.from(
      new Map(allVehicles.map(v => [v.id, v])).values()
    );

    return NextResponse.json({
      vehicles: uniqueVehicles.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        soldAt: v.soldAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📥 POST /api/vehicles - Datos recibidos:', {
      make: body.make,
      model: body.model,
      bodyType: body.bodyType || 'NO ENVIADO',
      bodyTypeType: typeof body.bodyType,
      bodyTypeValue: body.bodyType,
      hasBodyType: !!body.bodyType,
      bodyKeys: Object.keys(body),
    });
    console.log('👤 Usuario autenticado:', {
      userId: auth.userId,
      tenantId: auth.tenantId,
      role: auth.role,
      dealerId: auth.dealerId,
    });
    console.log(`💾 Guardando vehículo con tenantId: "${auth.tenantId}" y sellerId: "${auth.userId}"`);
    // Asignar sellerId automáticamente cuando un seller crea un vehículo
    const vehicle = await createVehicle(auth.tenantId, body, auth.userId);
    console.log(`✅ Vehículo creado con sellerId: ${(vehicle as any).sellerId || 'NO ASIGNADO'}`);
    console.log('✅ Vehículo creado:', {
      id: vehicle.id,
      bodyType: (vehicle as any).bodyType || 'NO GUARDADO',
      specificationsBodyType: (vehicle as any).specifications?.bodyType || 'NO GUARDADO',
      allSpecifications: (vehicle as any).specifications,
    });
    
    // Verificar que el bodyType se guardó correctamente
    if (body.bodyType) {
      console.log('🔍 Verificando bodyType guardado:', {
        recibido: body.bodyType,
        guardadoEnNivelSuperior: (vehicle as any).bodyType,
        guardadoEnSpecifications: (vehicle as any).specifications?.bodyType,
      });
    }

    // Crear notificación
    try {
      await createNotification({
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: 'system_alert',
        title: 'Vehículo Creado',
        message: `Se ha agregado un nuevo vehículo: ${body.year} ${body.make} ${body.model}`,
        channels: ['system'],
        metadata: { vehicleId: vehicle.id },
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // No fallar la creación del vehículo si falla la notificación
    }

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


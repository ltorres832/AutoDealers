import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST - Admin crea un vehículo y lo asigna a dealer y/o vendedor
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const {
      // Información del vehículo
      make,
      model,
      year,
      vin,
      price,
      mileage,
      condition,
      color,
      transmission,
      fuelType,
      description,
      features,
      images,
      photos,
      videos,
      
      // Asignación (puede ser dealer, vendedor, o ambos)
      dealerId,
      sellerId,
    } = body;

    // Validaciones
    if (!make || !model || !year || !price) {
      return createErrorResponse('Marca, modelo, año y precio son requeridos', 400);
    }

    if (!dealerId && !sellerId) {
      return createErrorResponse('Debes asignar el vehículo a un dealer y/o vendedor', 400);
    }

    const db = getFirestore();

    // Validar dealer si se proporciona
    let tenantId: string;
    let dealerName = '';
    
    if (dealerId) {
      const dealerDoc = await db.collection('tenants').doc(dealerId).get();
      if (!dealerDoc.exists) {
        return createErrorResponse('Dealer no encontrado', 404);
      }
      tenantId = dealerId;
      dealerName = dealerDoc.data()?.name || 'Dealer';
    }

    // Validar vendedor si se proporciona
    let sellerName = '';
    let sellerTenantId = '';
    
    if (sellerId) {
      const sellerDoc = await db.collection('users').doc(sellerId).get();
      if (!sellerDoc.exists) {
        return createErrorResponse('Vendedor no encontrado', 404);
      }
      const sellerData = sellerDoc.data();
      sellerTenantId = sellerData?.tenantId;
      sellerName = sellerData?.name || 'Vendedor';

      if (!sellerTenantId) {
        return createErrorResponse('Vendedor no tiene tenant asignado', 400);
      }

      // Si se proporcionaron ambos, verificar que el vendedor pertenezca al dealer
      if (dealerId && sellerTenantId !== dealerId) {
        return createErrorResponse('El vendedor no pertenece al dealer seleccionado', 400);
      }

      // Si solo hay vendedor, usar su tenantId
      if (!dealerId) {
        tenantId = sellerTenantId;
      }
    }

    // Crear el vehículo en la colección del tenant
    const vehicleRef = db
      .collection('tenants')
      .doc(tenantId!)
      .collection('vehicles')
      .doc();
    
    const vehicleData = {
      // Información básica
      tenantId: tenantId!,
      make,
      model,
      year: parseInt(year),
      vin: vin || null,
      price: parseFloat(price),
      currency: 'USD', // Por defecto
      mileage: mileage ? parseInt(mileage) : null,
      condition: condition || 'used',
      color: color || null,
      transmission: transmission || null,
      fuelType: fuelType || null,
      description: description || '',
      features: features || [],
      photos: photos || images || [], // Usar photos como principal
      videos: videos || [],
      specifications: {
        make,
        model,
        year: parseInt(year),
        color: color || null,
        mileage: mileage ? parseInt(mileage) : null,
        transmission: transmission || null,
        fuelType: fuelType || null,
        vin: vin || null,
      },
      
      // Estado
      status: 'available',
      
      // Asignación
      dealerId: dealerId || null,
      assignedTo: sellerId || null,
      
      // Metadata
      createdBy: auth.userId,
      createdByAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await vehicleRef.set(vehicleData);

    // Crear notificaciones según la asignación
    const notifications: Promise<any>[] = [];

    // Si se asignó a dealer, notificar a los admins del dealer
    if (dealerId) {
      const dealerAdmins = await db
        .collection('users')
        .where('tenantId', '==', dealerId)
        .where('role', '==', 'dealer')
        .get();

      dealerAdmins.docs.forEach((doc) => {
        notifications.push(
          db.collection('notifications').add({
            type: 'new_vehicle',
            title: 'Nuevo Vehículo Asignado',
            message: `El admin agregó un nuevo vehículo: ${year} ${make} ${model}${
              sellerId ? ` (asignado a ${sellerName})` : ''
            }`,
            userId: doc.id,
            tenantId: dealerId,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            data: {
              vehicleId: vehicleRef.id,
              vehicleName: `${year} ${make} ${model}`,
              assignedBy: 'admin',
            },
          })
        );
      });
    }

    // Si se asignó a vendedor, notificar directamente
    if (sellerId) {
      notifications.push(
        db.collection('notifications').add({
          type: 'vehicle_assigned',
          title: 'Vehículo Asignado',
          message: `El admin te asignó un vehículo: ${year} ${make} ${model}`,
          userId: sellerId,
          tenantId: tenantId!,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          data: {
            vehicleId: vehicleRef.id,
            vehicleName: `${year} ${make} ${model}`,
            assignedBy: 'admin',
          },
        })
      );
    }

    await Promise.all(notifications);

    // Mensaje de confirmación
    let assignmentMessage = '';
    if (dealerId && sellerId) {
      assignmentMessage = `Asignado a ${dealerName} (dealer) y ${sellerName} (vendedor)`;
    } else if (dealerId) {
      assignmentMessage = `Asignado a ${dealerName} (dealer)`;
    } else if (sellerId) {
      assignmentMessage = `Asignado a ${sellerName} (vendedor)`;
    }

    return createSuccessResponse(
      {
        vehicle: {
          id: vehicleRef.id,
          ...vehicleData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        message: `Vehículo creado exitosamente. ${assignmentMessage}`,
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    return createErrorResponse(error.message || 'Error al crear vehículo', 500);
  }
}


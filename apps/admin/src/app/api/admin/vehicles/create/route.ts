import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getFirestore, notifyUser, notifyManagersAndAdmins, isValidVin, normalizeVin } from '@autodealers/core';
import { createVehicle } from '@autodealers/inventory';

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
      dealerId,
      sellerId,
    } = body;

    if (!make || !model || !year || !price) {
      return createErrorResponse('Marca, modelo, año y precio son requeridos', 400);
    }

    const normalizedVin = normalizeVin(vin);
    if (!normalizedVin) {
      return createErrorResponse('El VIN es obligatorio', 400);
    }
    if (!isValidVin(normalizedVin)) {
      return createErrorResponse('VIN inválido. Debe tener 17 caracteres válidos.', 400);
    }

    if (!dealerId && !sellerId) {
      return createErrorResponse('Debes asignar el vehículo a un dealer y/o vendedor', 400);
    }

    const db = getFirestore();

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

      if (dealerId && sellerTenantId !== dealerId) {
        return createErrorResponse('El vendedor no pertenece al dealer seleccionado', 400);
      }

      if (!dealerId) {
        tenantId = sellerTenantId;
      }
    }

    const vehicle = await createVehicle(
      tenantId!,
      {
        make,
        model,
        year: parseInt(year, 10),
        vin: normalizedVin,
        price: parseFloat(price),
        currency: 'USD',
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        condition: condition || 'used',
        color: color || undefined,
        transmission: transmission || undefined,
        fuelType: fuelType || undefined,
        description: description || '',
        features: features || [],
        photos: photos || images || [],
        videos: videos || [],
        specifications: {
          make,
          model,
          year: parseInt(year, 10),
          color: color || undefined,
          mileage: mileage ? parseInt(mileage, 10) : undefined,
          transmission: transmission || undefined,
          fuelType: fuelType || undefined,
          vin: normalizedVin,
        },
        status: 'available',
        dealerId: dealerId || undefined,
        assignedTo: sellerId || undefined,
        createdByAdmin: true,
      } as never,
      sellerId || undefined
    );

    if (dealerId) {
      await notifyManagersAndAdmins(dealerId, {
        type: 'system_alert',
        title: 'Nuevo Vehículo Asignado',
        message: `El admin agregó un nuevo vehículo: ${year} ${make} ${model}${
          sellerId ? ` (asignado a ${sellerName})` : ''
        }`,
        metadata: {
          vehicleId: vehicle.id,
          vehicleName: `${year} ${make} ${model}`,
          assignedBy: 'admin',
        },
      });
    }

    if (sellerId && tenantId) {
      await notifyUser(tenantId, sellerId, {
        type: 'system_alert',
        title: 'Vehículo Asignado',
        message: `El admin te asignó un vehículo: ${year} ${make} ${model}`,
        metadata: {
          vehicleId: vehicle.id,
          vehicleName: `${year} ${make} ${model}`,
          assignedBy: 'admin',
        },
      });
    }

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
        vehicle,
        message: `Vehículo creado exitosamente. ${assignmentMessage}`,
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    const message = error?.message || 'Error al crear vehículo';
    const isVin = /VIN/i.test(message);
    return createErrorResponse(message, isVin ? 400 : 500);
  }
}

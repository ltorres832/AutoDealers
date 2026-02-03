import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateVehicle, getVehicleById } from '@autodealers/inventory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicle = await getVehicleById(auth.tenantId, id);
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({
      vehicle: {
        ...vehicle,
        createdAt: vehicle.createdAt.toISOString(),
        updatedAt: vehicle.updatedAt.toISOString(),
        soldAt: vehicle.soldAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = '';
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que el vehículo existe y pertenece al tenant
    const existingVehicle = await getVehicleById(auth.tenantId, id);
    if (!existingVehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const body = await request.json();
    
    console.log('📥 PUT /api/vehicles/[id] - Datos recibidos:', {
      vehicleId: id,
      bodyKeys: Object.keys(body),
      photos: body.photos,
      videos: body.videos,
      photosCount: Array.isArray(body.photos) ? body.photos.length : 0,
      videosCount: Array.isArray(body.videos) ? body.videos.length : 0,
    });
    
    // Preparar los datos de actualización
    const updateData: any = {};
    
    if (body.make !== undefined) updateData.make = body.make;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.bodyType !== undefined) {
      // Normalizar bodyType: trim y lowercase
      const bodyTypeValue = body.bodyType && body.bodyType.trim() !== '' 
        ? body.bodyType.trim().toLowerCase() 
        : undefined;
      if (bodyTypeValue) {
        updateData.bodyType = bodyTypeValue;
        // También asegurar que esté en specifications
        if (body.specifications && typeof body.specifications === 'object') {
          updateData.specifications = {
            ...updateData.specifications,
            bodyType: bodyTypeValue,
          };
        } else if (!updateData.specifications && existingVehicle.specifications) {
          updateData.specifications = {
            ...existingVehicle.specifications,
            bodyType: bodyTypeValue,
          };
        } else if (!updateData.specifications) {
          updateData.specifications = {
            bodyType: bodyTypeValue,
          };
        }
      }
    }
    if (body.year !== undefined) updateData.year = body.year;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.mileage !== undefined) updateData.mileage = body.mileage ? parseInt(body.mileage) : undefined;
    if (body.status !== undefined) updateData.status = body.status;
    
    // CRÍTICO: Siempre incluir photos y videos si están presentes, incluso si son arrays vacíos
    if (body.photos !== undefined) {
      // Asegurar que sea un array
      updateData.photos = Array.isArray(body.photos) ? body.photos : [];
      console.log('📸 Fotos a guardar:', updateData.photos);
    }
    if (body.videos !== undefined) {
      // Asegurar que sea un array
      updateData.videos = Array.isArray(body.videos) ? body.videos : [];
      console.log('🎥 Videos a guardar:', updateData.videos);
    }
    if (body.specifications !== undefined) updateData.specifications = body.specifications;
    
    // CRÍTICO: Preservar stockNumber si se proporciona
    if (body.stockNumber !== undefined) {
      updateData.stockNumber = body.stockNumber;
      // También asegurar que esté en specifications si se proporciona
      if (body.specifications && typeof body.specifications === 'object') {
        updateData.specifications = {
          ...updateData.specifications,
          stockNumber: body.stockNumber,
        };
      } else if (!updateData.specifications && existingVehicle.specifications) {
        // Si no se proporcionan specifications pero el vehículo las tiene, preservarlas y agregar stockNumber
        updateData.specifications = {
          ...existingVehicle.specifications,
          stockNumber: body.stockNumber,
        };
      }
    }
    
    if (body.sellerCommissionType !== undefined) updateData.sellerCommissionType = body.sellerCommissionType;
    if (body.sellerCommissionRate !== undefined) updateData.sellerCommissionRate = body.sellerCommissionRate ? parseFloat(body.sellerCommissionRate) : undefined;
    if (body.sellerCommissionFixed !== undefined) updateData.sellerCommissionFixed = body.sellerCommissionFixed ? parseFloat(body.sellerCommissionFixed) : undefined;
    if (body.insuranceCommissionType !== undefined) updateData.insuranceCommissionType = body.insuranceCommissionType;
    if (body.insuranceCommissionRate !== undefined) updateData.insuranceCommissionRate = body.insuranceCommissionRate ? parseFloat(body.insuranceCommissionRate) : undefined;
    if (body.insuranceCommissionFixed !== undefined) updateData.insuranceCommissionFixed = body.insuranceCommissionFixed ? parseFloat(body.insuranceCommissionFixed) : undefined;
    if (body.accessoriesCommissionType !== undefined) updateData.accessoriesCommissionType = body.accessoriesCommissionType;
    if (body.accessoriesCommissionRate !== undefined) updateData.accessoriesCommissionRate = body.accessoriesCommissionRate ? parseFloat(body.accessoriesCommissionRate) : undefined;
    if (body.accessoriesCommissionFixed !== undefined) updateData.accessoriesCommissionFixed = body.accessoriesCommissionFixed ? parseFloat(body.accessoriesCommissionFixed) : undefined;
    if (body.publishedOnPublicPage !== undefined) updateData.publishedOnPublicPage = body.publishedOnPublicPage;

    console.log('🔄 Llamando a updateVehicle con:', {
      tenantId: auth.tenantId,
      vehicleId: id,
      updateData,
    });
    
    await updateVehicle(auth.tenantId, id, updateData);

    const updatedVehicle = await getVehicleById(auth.tenantId, id);
    
    console.log('✅ Vehículo actualizado, datos retornados:', {
      vehicleId: updatedVehicle?.id,
      photosCount: updatedVehicle?.photos?.length || 0,
      videosCount: updatedVehicle?.videos?.length || 0,
      photos: updatedVehicle?.photos,
    });

    return NextResponse.json({ 
      vehicle: {
        ...updatedVehicle!,
        createdAt: updatedVehicle!.createdAt.toISOString(),
        updatedAt: updatedVehicle!.updatedAt.toISOString(),
        soldAt: updatedVehicle!.soldAt?.toISOString(),
      }
    });
  } catch (error: any) {
    console.error('❌ Error updating vehicle:', {
      error: error.message,
      stack: error.stack,
      vehicleId: id,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


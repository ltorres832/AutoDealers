import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sellerId } = await params;
    const db = getFirestore();

    // Obtener seller
    const sellerDoc = await db.collection('users').doc(sellerId).get();
    if (!sellerDoc.exists) {
      return NextResponse.json({ error: 'Seller no encontrado' }, { status: 404 });
    }

    const sellerData = sellerDoc.data();
    const tenantId = sellerData?.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Seller no tiene tenantId' }, { status: 404 });
    }

    // Obtener TODOS los vehículos del tenant
    const allVehiclesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .get();

    const allVehicles = allVehiclesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Vehículos con sellerId específico
    const vehiclesWithSellerId = allVehicles.filter((v: any) => v.sellerId === sellerId);
    
    // Vehículos con assignedTo específico
    const vehiclesWithAssignedTo = allVehicles.filter((v: any) => v.assignedTo === sellerId);
    
    // Vehículos disponibles (no vendidos/eliminados)
    const availableVehicles = allVehicles.filter((v: any) => {
      const isExcluded = v.status === 'sold' || 
                        v.status === 'deleted' || 
                        v.status === 'inactive' ||
                        v.deleted === true;
      return !isExcluded;
    });

    // Vehículos que deberían mostrarse
    const shouldShow = allVehicles.filter((v: any) => {
      const belongsToSeller = v.sellerId === sellerId || v.assignedTo === sellerId;
      const isExcluded = v.status === 'sold' || 
                        v.status === 'deleted' || 
                        v.status === 'inactive' ||
                        v.deleted === true;
      return belongsToSeller && !isExcluded;
    });

    return NextResponse.json({
      seller: {
        id: sellerId,
        name: sellerData?.name,
        tenantId: tenantId,
      },
      statistics: {
        totalVehiclesInTenant: allVehicles.length,
        vehiclesWithSellerId: vehiclesWithSellerId.length,
        vehiclesWithAssignedTo: vehiclesWithAssignedTo.length,
        availableVehicles: availableVehicles.length,
        shouldShow: shouldShow.length,
      },
      vehiclesWithSellerId: vehiclesWithSellerId.map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        status: v.status,
        sellerId: v.sellerId,
      })),
      vehiclesWithAssignedTo: vehiclesWithAssignedTo.map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        status: v.status,
        assignedTo: v.assignedTo,
      })),
      allVehiclesSample: allVehicles.slice(0, 10).map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        status: v.status,
        sellerId: v.sellerId || 'NO ASIGNADO',
        assignedTo: v.assignedTo || 'NO ASIGNADO',
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}


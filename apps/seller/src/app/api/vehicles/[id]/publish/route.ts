import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { findSellerVehicleById } from '@/lib/seller-vehicles';

const db = getFirestore();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const found = await findSellerVehicleById(auth, vehicleId);
    if (!found) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { publishedOnPublicPage } = body;

    const vehicleRef = db
      .collection('tenants')
      .doc(found.tenantId)
      .collection('vehicles')
      .doc(vehicleId);

    const vehicleDoc = await vehicleRef.get();
    if (!vehicleDoc.exists) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    const vehicleData = vehicleDoc.data();

    if (publishedOnPublicPage === true && vehicleData?.status !== 'available') {
      return NextResponse.json({
        error: 'Solo los vehículos disponibles pueden publicarse en la página pública',
        currentStatus: vehicleData?.status,
      }, { status: 400 });
    }

    const publishValue = publishedOnPublicPage === true || publishedOnPublicPage === 'true';

    const updateData: Record<string, unknown> = {
      publishedOnPublicPage: publishValue,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (publishValue && vehicleData?.status !== 'available') {
      updateData.status = 'available';
    }

    await vehicleRef.update(updateData);

    return NextResponse.json({
      success: true,
      publishedOnPublicPage: publishValue,
      vehicleId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating vehicle publish status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: vehicleId } = await params;
    const body = await request.json();
    const { publishedOnPublicPage } = body;

    // Verificar que el vehículo pertenece al tenant
    const vehicleRef = db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('vehicles')
      .doc(vehicleId);

    const vehicleDoc = await vehicleRef.get();
    if (!vehicleDoc.exists) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    // Actualizar el campo publishedOnPublicPage
    await vehicleRef.update({
      publishedOnPublicPage: publishedOnPublicPage === true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      publishedOnPublicPage: publishedOnPublicPage === true,
    });
  } catch (error: any) {
    console.error('Error updating vehicle publish status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


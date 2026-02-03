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
    const { id: vehicleId } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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

    const vehicleData = vehicleDoc.data();
    
    // Verificar que el vehículo esté disponible antes de publicar
    if (publishedOnPublicPage === true && vehicleData?.status !== 'available') {
      return NextResponse.json({ 
        error: 'Solo los vehículos disponibles pueden publicarse en la página pública',
        currentStatus: vehicleData?.status
      }, { status: 400 });
    }

    // Actualizar el campo publishedOnPublicPage
    const publishValue = publishedOnPublicPage === true || publishedOnPublicPage === 'true';
    
    const updateData: any = {
      publishedOnPublicPage: publishValue,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Si se está publicando y el vehículo no está disponible, también actualizar el status
    if (publishValue && vehicleData?.status !== 'available') {
      updateData.status = 'available';
      console.log(`⚠️ Vehículo ${vehicleId} tenía status '${vehicleData?.status}', cambiado a 'available' para publicación`);
    }
    
    await vehicleRef.update(updateData);

    console.log(`✅ Vehículo ${vehicleId} actualizado: publishedOnPublicPage = ${publishValue}, status = ${updateData.status || vehicleData?.status}`);

    // Verificar que se guardó correctamente
    const updatedDoc = await vehicleRef.get();
    const updatedData = updatedDoc.data();
    console.log(`🔍 Verificación: publishedOnPublicPage = ${updatedData?.publishedOnPublicPage}, status = ${updatedData?.status}`);

    return NextResponse.json({
      success: true,
      publishedOnPublicPage: publishValue,
      vehicleId,
    });
  } catch (error: any) {
    console.error('Error updating vehicle publish status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


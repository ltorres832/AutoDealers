import { NextRequest, NextResponse } from 'next/server';

export async function generateStaticParams() {
  return [];
}
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;

    // Buscar el vehículo en todos los tenants
    const vehiclesSnapshot = await db
      .collectionGroup('vehicles')
      .where(admin.firestore.FieldPath.documentId(), '==', vehicleId)
      .limit(1)
      .get();

    if (vehiclesSnapshot.empty) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicleDoc = vehiclesSnapshot.docs[0];
    const vehicleRef = vehicleDoc.ref;

    // Incrementar contador de vistas (si existe el campo)
    const currentData = vehicleDoc.data();
    if (currentData.views !== undefined) {
      await vehicleRef.update({
        views: admin.firestore.FieldValue.increment(1),
        lastViewAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error incrementing vehicle views:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



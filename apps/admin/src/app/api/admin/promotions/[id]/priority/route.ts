import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Actualiza la prioridad manual de una promoción específica
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, priority } = body;

    if (!tenantId || priority === undefined) {
      return NextResponse.json(
        { error: 'Tenant ID and priority are required' },
        { status: 400 }
      );
    }

    if (priority < 1 || priority > 1000) {
      return NextResponse.json(
        { error: 'Priority must be between 1 and 1000' },
        { status: 400 }
      );
    }

    const { id } = await params;
    // Buscar la promoción
    const promotionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('promotions')
      .doc(id);

    const promotionDoc = await promotionRef.get();
    if (!promotionDoc.exists) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    // Actualizar prioridad
    await promotionRef.update({
      priority,
      priorityManuallySet: true,
      prioritySetBy: auth.userId,
      prioritySetAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Prioridad de promoción ${id} actualizada a ${priority} por admin ${auth.userId}`);

    return NextResponse.json({ success: true, priority });
  } catch (error: any) {
    console.error('Error updating promotion priority:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



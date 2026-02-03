import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { addCosignerToRequest, updateCosignerStatus, calculateCombinedScore, getFIRequestById } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || (auth.role !== 'dealer' && auth.role !== 'seller')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, cosignerData } = body;

    if (!requestId || !cosignerData) {
      return NextResponse.json(
        { error: 'requestId y cosignerData son requeridos' },
        { status: 400 }
      );
    }

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const cosigner = await addCosignerToRequest(
      auth.tenantId,
      requestId,
      cosignerData
    );

    // Calcular score combinado si hay approvalScore
    const fiRequest = await getFIRequestById(auth.tenantId, requestId);
    if (fiRequest?.approvalScore && cosigner.creditInfo.creditRange) {
      const combinedScore = calculateCombinedScore(
        fiRequest.approvalScore,
        cosigner.creditInfo.creditRange
      );

      // Actualizar solicitud con score combinado
      const db = getFirestore();
      const requestRef = db
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('fi_requests')
        .doc(requestId);

      await requestRef.update({
        combinedScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ cosigner });
  } catch (error: any) {
    console.error('Error adding cosigner:', error);
    return NextResponse.json(
      { error: error.message || 'Error al agregar co-signer' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, status } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'requestId y status son requeridos' },
        { status: 400 }
      );
    }

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    await updateCosignerStatus(
      auth.tenantId,
      requestId,
      status,
      auth.userId
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating cosigner status:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar estado del co-signer' },
      { status: 500 }
    );
  }
}


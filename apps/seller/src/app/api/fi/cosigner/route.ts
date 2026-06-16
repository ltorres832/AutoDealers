import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import {
  addCosignerToRequest,
  updateCosignerOnRequest,
  updateCosignerStatus,
  calculateCombinedScore,
  getFIRequestById,
} from '@autodealers/crm';
import { getFirestore, isValidSsn } from '@autodealers/core';
import * as admin from 'firebase-admin';

async function syncCombinedScore(tenantId: string, requestId: string, cosignerCreditRange: string) {
  const fiRequest = await getFIRequestById(tenantId, requestId);
  if (fiRequest?.approvalScore && cosignerCreditRange) {
    const combinedScore = calculateCombinedScore(
      fiRequest.approvalScore,
      cosignerCreditRange as any
    );
    const db = getFirestore();
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('fi_requests')
      .doc(requestId)
      .update({
        combinedScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }
}

function validateCosignerSsn(cosignerData: { ssn?: string }) {
  if (cosignerData.ssn && !isValidSsn(cosignerData.ssn)) {
    throw new Error('SSN inválido. Use el formato XXX-XX-XXXX (9 dígitos).');
  }
  if (!cosignerData.ssn) {
    throw new Error('El SSN completo del codeudor es requerido.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'seller') {
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

    const fiGatePost = await requireTenantFeature(auth.tenantId, 'useFIModule');
    if (fiGatePost) return fiGatePost;

    validateCosignerSsn(cosignerData);

    const cosigner = await addCosignerToRequest(auth.tenantId, requestId, cosignerData);

    await syncCombinedScore(auth.tenantId, requestId, cosigner.creditInfo.creditRange);

    return NextResponse.json({ cosigner });
  } catch (error: unknown) {
    console.error('Error adding cosigner (seller):', error);
    const message = error instanceof Error ? error.message : 'Error al agregar codeudor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'seller') {
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

    const fiGatePut = await requireTenantFeature(auth.tenantId, 'useFIModule');
    if (fiGatePut) return fiGatePut;

    validateCosignerSsn(cosignerData);

    const cosigner = await updateCosignerOnRequest(auth.tenantId, requestId, cosignerData);

    await syncCombinedScore(auth.tenantId, requestId, cosigner.creditInfo.creditRange);

    return NextResponse.json({ cosigner });
  } catch (error: unknown) {
    console.error('Error updating cosigner (seller):', error);
    const message = error instanceof Error ? error.message : 'Error al actualizar codeudor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'seller') {
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

    const fiGatePatch = await requireTenantFeature(auth.tenantId, 'useFIModule');
    if (fiGatePatch) return fiGatePatch;

    await updateCosignerStatus(auth.tenantId, requestId, status, auth.userId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating cosigner status (seller):', error);
    const message = error instanceof Error ? error.message : 'Error al actualizar codeudor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

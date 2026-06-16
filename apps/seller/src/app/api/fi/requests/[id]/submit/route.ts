// API route para enviar una solicitud F&I al gerente F&I (Seller)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { notifyFIRequestSubmitted } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { fiStatusToExpeditionStage, syncLinkedCustomerFileExpedition } from '@autodealers/crm';

const db = getFirestore();

// Implementación directa para evitar problemas de webpack
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function getFIRequestByIdDirect(tenantId: string, requestId: string): Promise<any> {
  const requestDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId)
    .get();

  if (!requestDoc.exists) {
    return null;
  }

  const data = requestDoc.data();
  return {
    id: requestDoc.id,
    ...data,
    history: (data?.history || []).map((h: any) => ({
      ...h,
      timestamp: h.timestamp?.toDate() || new Date(),
    })),
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
    submittedAt: data?.submittedAt?.toDate() || undefined,
    reviewedAt: data?.reviewedAt?.toDate() || undefined,
  } as any;
}

async function submitFIRequestDirect(
  tenantId: string,
  requestId: string,
  submittedBy: string,
  sellerNotes?: string
) {
  const requestRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_requests')
    .doc(requestId);

  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new Error('Solicitud F&I no encontrada');
  }

  const currentData = requestDoc.data();
  const currentHistory = currentData?.history || [];

  const historyEntry = {
    id: generateRandomId(),
    action: 'submitted',
    performedBy: submittedBy,
    timestamp: new Date(),
    previousStatus: currentData?.status,
    newStatus: 'submitted',
    notes: sellerNotes || 'Solicitud enviada a F&I',
  };

  await requestRef.update({
    status: 'submitted',
    expeditionStage: fiStatusToExpeditionStage('submitted'),
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    submittedBy,
    sellerNotes: sellerNotes || currentData?.sellerNotes,
    history: [...currentHistory, historyEntry],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  try {
    await syncLinkedCustomerFileExpedition(tenantId, requestId);
  } catch (e) {
    console.error('syncLinkedCustomerFileExpedition (submit route):', e);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es seller
    if (user.role !== 'seller') {
      return NextResponse.json({ error: 'Solo vendedores pueden enviar solicitudes F&I' }, { status: 403 });
    }

    const fiGate = await requireTenantFeature(user.tenantId!, 'useFIModule');
    if (fiGate) return fiGate;

    const body = await request.json();
    const { sellerNotes } = body;

    // Verificar que la solicitud existe y pertenece al tenant
    const existingRequest = await getFIRequestByIdDirect(user.tenantId, id) as any;
    if (!existingRequest) {
      return NextResponse.json({ error: 'Solicitud F&I no encontrada' }, { status: 404 });
    }

    // Verificar que el vendedor es el creador
    if (existingRequest.createdBy !== user.userId) {
      return NextResponse.json({ error: 'No tienes permiso para enviar esta solicitud' }, { status: 403 });
    }

    // Verificar que está en estado draft
    if (existingRequest.status !== 'draft') {
      return NextResponse.json(
        { error: `La solicitud ya fue enviada. Estado actual: ${existingRequest.status}` },
        { status: 400 }
      );
    }

    // Enviar la solicitud
    await submitFIRequestDirect(user.tenantId!, id, user.userId, sellerNotes);

    // Obtener la solicitud actualizada
    const updatedRequest = await getFIRequestByIdDirect(user.tenantId, id) as any;

    try {
      const clientDoc = await db
        .collection('tenants')
        .doc(user.tenantId)
        .collection('fi_clients')
        .doc((updatedRequest as any).clientId)
        .get();
      const clientName = clientDoc.data()?.name || 'Cliente';

      await notifyFIRequestSubmitted(user.tenantId!, {
        requestId: id,
        clientName,
        sellerUserId: user.userId,
      });
    } catch (error) {
      console.error('Error enviando notificación F&I:', error);
    }

    return NextResponse.json({ request: updatedRequest });
  } catch (error: any) {
    console.error('Error en POST /api/fi/requests/[id]/submit:', error);
    return NextResponse.json(
      { error: error.message || 'Error al enviar solicitud F&I' },
      { status: 500 }
    );
  }
}


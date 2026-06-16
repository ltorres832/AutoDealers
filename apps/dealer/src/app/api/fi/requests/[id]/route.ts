// API route para gestionar una solicitud F&I específica (Dealer/Gerente F&I)
// GET: Obtener una solicitud
// PATCH: Actualizar estado o agregar notas

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { notifyFIRequestStatusChanged, getFirestore } from '@autodealers/core';
import { getFIRequestById, getFIClientById, fiStatusToExpeditionStage, syncLinkedCustomerFileExpedition } from '@autodealers/crm';
import * as admin from 'firebase-admin';

async function updateFIRequestStatusDirect(
  tenantId: string,
  requestId: string,
  newStatus: string,
  reviewedBy: string,
  fiManagerNotes?: string,
  internalNotes?: string
) {
  const db = getFirestore();
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
    id: Math.random().toString(36).substring(2, 15),
    action: 'status_changed',
    performedBy: reviewedBy,
    timestamp: new Date(),
    previousStatus: currentData?.status,
    newStatus,
    notes: fiManagerNotes || internalNotes || `Estado cambiado a ${newStatus}`,
  };

  const updateData: any = {
    status: newStatus,
    expeditionStage: fiStatusToExpeditionStage(newStatus),
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewedBy,
    history: [...currentHistory, historyEntry],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (fiManagerNotes) {
    updateData.fiManagerNotes = fiManagerNotes;
  }

  if (internalNotes) {
    updateData.internalNotes = internalNotes;
  }

  await requestRef.update(updateData);

  try {
    await syncLinkedCustomerFileExpedition(tenantId, requestId);
  } catch (e) {
    console.error('syncLinkedCustomerFileExpedition (dealer PATCH):', e);
  }
}

async function addFIRequestNoteDirect(
  tenantId: string,
  requestId: string,
  note: string,
  addedBy: string,
  isInternal: boolean = false
) {
  const db = getFirestore();
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
    id: Math.random().toString(36).substring(2, 15),
    action: isInternal ? 'internal_note_added' : 'note_added',
    performedBy: addedBy,
    timestamp: new Date(),
    notes: note,
  };

  await requestRef.update({
    history: [...currentHistory, historyEntry],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es dealer
    if (!isDealerPortalRole(user.role)) {
      return NextResponse.json({ error: 'Solo dealers pueden acceder' }, { status: 403 });
    }

    const fiGateGet = await requireTenantFeature(user.tenantId!, 'useFIModule');
    if (fiGateGet) return fiGateGet;

    const { id } = await params;
    const fiRequest = await getFIRequestById(user.tenantId!, id);

    if (!fiRequest) {
      return NextResponse.json({ error: 'Solicitud F&I no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ request: fiRequest });
  } catch (error: any) {
    console.error('Error en GET /api/fi/requests/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener solicitud F&I' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es dealer
    if (!isDealerPortalRole(user.role)) {
      return NextResponse.json({ error: 'Solo dealers pueden actualizar solicitudes F&I' }, { status: 403 });
    }

    const fiGatePatch = await requireTenantFeature(user.tenantId!, 'useFIModule');
    if (fiGatePatch) return fiGatePatch;

    const { id } = await params;
    const body = await request.json();
    const {
      status,
      fiManagerNotes,
      internalNotes,
      note, // Para agregar una nota sin cambiar estado
    } = body;

    // Verificar que la solicitud existe
    const existingRequest = await getFIRequestById(user.tenantId!, id);
    if (!existingRequest) {
      return NextResponse.json({ error: 'Solicitud F&I no encontrada' }, { status: 404 });
    }

    // Si se está agregando solo una nota
    if (note && !status) {
      await addFIRequestNoteDirect(
        user.tenantId!,
        id,
        note,
        user.userId,
        !!internalNotes // Si hay internalNotes, la nota es interna
      );
    }

    // Si se está cambiando el estado
    if (status) {
      await updateFIRequestStatusDirect(
        user.tenantId!,
        id,
        status,
        user.userId,
        fiManagerNotes,
        internalNotes
      );
    }

    // Obtener la solicitud actualizada
    const updatedRequest = await getFIRequestById(user.tenantId!, id);

    // Notificar al vendedor cuando cambia el estado
    if (status && updatedRequest) {
      try {
        const statusLabels: Record<string, string> = {
          approved: 'Aprobada',
          rejected: 'Rechazada',
          pre_approved: 'Pre-Aprobada',
          pending_info: 'Pendiente de Información',
        };
        const client = await getFIClientById(user.tenantId!, updatedRequest.clientId);
        const clientName = (client as { name?: string })?.name || 'Cliente';

        await notifyFIRequestStatusChanged(user.tenantId!, {
          requestId: id,
          clientName,
          sellerUserId: updatedRequest.createdBy,
          status,
          statusLabel: statusLabels[status] || status,
          changedByUserId: user.userId,
        });
      } catch (error) {
        console.error('Error enviando notificación:', error);
      }
    }

    return NextResponse.json({ request: updatedRequest });
  } catch (error: any) {
    console.error('Error en PATCH /api/fi/requests/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar solicitud F&I' },
      { status: 500 }
    );
  }
}


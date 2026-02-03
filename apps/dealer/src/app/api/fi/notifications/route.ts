import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createNotification, getFirestore } from '@autodealers/core';

const db = getFirestore();

// Implementación directa para evitar problemas de webpack
async function getFIRequestByIdDirect(tenantId: string, requestId: string) {
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
  };
}

async function getFIClientByIdDirect(tenantId: string, clientId: string) {
  const clientDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc(clientId)
    .get();

  if (!clientDoc.exists) {
    return null;
  }

  const data = clientDoc.data();
  return {
    id: clientDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, type, message, channels } = body;

    if (!requestId || !type || !message) {
      return NextResponse.json(
        { error: 'requestId, type y message son requeridos' },
        { status: 400 }
      );
    }

    const fiRequest = await getFIRequestByIdDirect(auth.tenantId!, requestId);
    if (!fiRequest) {
      return NextResponse.json(
        { error: 'Solicitud F&I no encontrada' },
        { status: 404 }
      );
    }

    const fiRequestAny = fiRequest as any;
    const client = await getFIClientByIdDirect(auth.tenantId!, fiRequestAny.clientId);
    const clientAny = client as any;
    
    // Notificar al vendedor que creó la solicitud
    if (fiRequestAny.createdBy) {
      if (!auth.tenantId) {
        return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
      }
      await createNotification({
        tenantId: auth.tenantId,
        userId: fiRequestAny.createdBy,
        type: type as any,
        title: `Actualización F&I - ${clientAny?.name || 'Cliente'}`,
        message,
        channels: channels || ['dashboard', 'email'],
        metadata: {
          requestId,
          clientId: fiRequestAny.clientId,
          status: fiRequestAny.status,
        },
      });
    }

    // Notificar al gerente F&I si hay uno asignado
    if (fiRequestAny.reviewedBy && fiRequestAny.reviewedBy !== fiRequestAny.createdBy) {
      if (!auth.tenantId) {
        return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
      }
      await createNotification({
        tenantId: auth.tenantId,
        userId: fiRequestAny.reviewedBy,
        type: type as any,
        title: `Actualización F&I - ${clientAny?.name || 'Cliente'}`,
        message,
        channels: channels || ['dashboard', 'email'],
        metadata: {
          requestId,
          clientId: fiRequestAny.clientId,
          status: fiRequestAny.status,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error.message || 'Error al enviar notificación' },
      { status: 500 }
    );
  }
}


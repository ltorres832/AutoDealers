import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST - Dealer reasigna un lead a uno de sus vendedores
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sellerId } = body;

    if (!sellerId) {
      return NextResponse.json(
        { error: 'Debes seleccionar un vendedor' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    const { id: leadId } = await params;
    // Verificar que el lead existe y pertenece a este tenant
    const leadDoc = await db.collection('leads').doc(leadId).get();
    if (!leadDoc.exists) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    const leadData = leadDoc.data();
    if (leadData?.tenantId !== auth.tenantId) {
      return NextResponse.json(
        { error: 'No tienes permiso para reasignar este lead' },
        { status: 403 }
      );
    }

    // Verificar que el vendedor existe y pertenece a este tenant
    const sellerDoc = await db.collection('users').doc(sellerId).get();
    if (!sellerDoc.exists) {
      return NextResponse.json(
        { error: 'Vendedor no encontrado' },
        { status: 404 }
      );
    }

    const sellerData = sellerDoc.data();
    if (sellerData?.tenantId !== auth.tenantId) {
      return NextResponse.json(
        { error: 'El vendedor no pertenece a tu concesionario' },
        { status: 403 }
      );
    }

    // Reasignar el lead
    await db.collection('leads').doc(leadId).update({
      assignedTo: sellerId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reassignedAt: admin.firestore.FieldValue.serverTimestamp(),
      reassignedBy: auth.userId,
    });

    // Crear notificación para el vendedor
    await db.collection('notifications').add({
      type: 'lead_assigned',
      title: 'Lead Asignado',
      message: `Te han asignado un nuevo lead: ${leadData?.name || 'Sin nombre'}`,
      userId: sellerId,
      tenantId: auth.tenantId,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        leadId: leadId,
        leadName: leadData?.name || 'Sin nombre',
        assignedBy: auth.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Lead asignado a ${sellerData?.name} exitosamente`,
    });
  } catch (error: any) {
    console.error('Error reassigning lead:', error);
    return NextResponse.json(
      { error: error.message || 'Error al reasignar lead' },
      { status: 500 }
    );
  }
}



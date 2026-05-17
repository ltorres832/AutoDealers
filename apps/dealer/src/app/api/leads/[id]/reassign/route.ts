import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { assignLead, getLeadById } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

/**
 * POST - Dealer reasigna un lead a uno de sus vendedores (`tenants/{tenantId}/leads`).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sellerId } = body;

    if (!sellerId) {
      return NextResponse.json({ error: 'Debes seleccionar un vendedor' }, { status: 400 });
    }

    const db = getFirestore();
    const { id: leadId } = await params;

    const lead = await getLeadById(auth.tenantId!, leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    if (lead.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'No tienes permiso para reasignar este lead' }, { status: 403 });
    }

    const sellerDoc = await db.collection('users').doc(sellerId).get();
    if (!sellerDoc.exists) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const sellerData = sellerDoc.data();
    if (sellerData?.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'El vendedor no pertenece a tu concesionario' }, { status: 403 });
    }

    await assignLead(auth.tenantId!, leadId, sellerId);

    await db
      .collection('tenants')
      .doc(auth.tenantId!)
      .collection('leads')
      .doc(leadId)
      .update({
        reassignedAt: admin.firestore.FieldValue.serverTimestamp(),
        reassignedBy: auth.userId,
      });

    const contactName = lead.contact?.name || 'Cliente';

    await db.collection('notifications').add({
      type: 'lead_assigned',
      title: 'Lead Asignado',
      message: `Te han asignado un nuevo lead: ${contactName}`,
      userId: sellerId,
      tenantId: auth.tenantId,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        leadId,
        leadName: contactName,
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

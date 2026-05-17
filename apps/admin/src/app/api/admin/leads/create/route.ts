import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { createLead, normalizeLeadSource } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

/**
 * POST - Admin crea un lead y lo asigna a dealer o seller.
 * Persistencia unificada: `tenants/{tenantId}/leads` (mismo CRM que dealer/seller).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      source,
      notes,
      vehicleInterest,
      budget,
      assignmentType,
      dealerId,
      sellerId,
    } = body;

    if (!name || !phone) {
      return createErrorResponse('Nombre y teléfono son requeridos', 400);
    }

    if (!assignmentType || (assignmentType !== 'dealer' && assignmentType !== 'seller')) {
      return createErrorResponse('Tipo de asignación inválido', 400);
    }

    if (assignmentType === 'dealer' && !dealerId) {
      return createErrorResponse('Debes seleccionar un dealer', 400);
    }

    if (assignmentType === 'seller' && !sellerId) {
      return createErrorResponse('Debes seleccionar un vendedor', 400);
    }

    const db = getFirestore();

    let tenantId: string;
    let assignedTo: string | undefined;
    let assignedToName: string;

    if (assignmentType === 'dealer') {
      const tenantDoc = await db.collection('tenants').doc(dealerId).get();
      if (!tenantDoc.exists) {
        return createErrorResponse('Dealer no encontrado', 404);
      }
      tenantId = dealerId;
      assignedTo = undefined;
      assignedToName = tenantDoc.data()?.name || 'Dealer';
    } else {
      const sellerDoc = await db.collection('users').doc(sellerId).get();
      if (!sellerDoc.exists) {
        return createErrorResponse('Vendedor no encontrado', 404);
      }
      const sellerData = sellerDoc.data();
      tenantId = sellerData?.tenantId;
      assignedTo = sellerId;
      assignedToName = sellerData?.name || 'Vendedor';

      if (!tenantId) {
        return createErrorResponse('Vendedor no tiene tenant asignado', 400);
      }
    }

    const leadSource = normalizeLeadSource(source, 'admin_manual');

    const lead = await createLead(
      tenantId,
      leadSource,
      {
        name,
        email: email || undefined,
        phone,
        preferredChannel: 'phone',
      },
      typeof notes === 'string' ? notes : '',
      {
        assignedTo: assignedTo || null,
        createdBy: auth.userId,
        createdByAdmin: true,
        vehicleInterest: vehicleInterest ?? null,
        budget: budget != null && budget !== '' ? budget : undefined,
        lastContactDate: null,
        nextFollowUpDate: null,
      }
    );

    const notificationRef = db.collection('notifications').doc();
    await notificationRef.set({
      type: 'lead_created' as any,
      title: 'Nuevo Lead Asignado',
      message:
        assignmentType === 'dealer'
          ? `El admin te asignó un nuevo lead: ${name}`
          : `El admin te asignó un nuevo lead: ${name}`,
      userId: assignedTo || null,
      tenantId,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        leadId: lead.id,
        leadName: name,
        assignedBy: 'admin',
      },
    });

    if (assignmentType === 'dealer') {
      const dealerAdmins = await db
        .collection('users')
        .where('tenantId', '==', tenantId)
        .where('role', '==', 'dealer')
        .get();

      await Promise.all(
        dealerAdmins.docs.map((doc) =>
          db.collection('notifications').add({
            type: 'lead_created' as any,
            title: 'Nuevo Lead Asignado',
            message: `El admin asignó un nuevo lead a tu concesionario: ${name}`,
            userId: doc.id,
            tenantId,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            data: {
              leadId: lead.id,
              leadName: name,
              assignedBy: 'admin',
            },
          })
        )
      );
    }

    return createSuccessResponse(
      {
        lead: {
          id: lead.id,
          tenantId: lead.tenantId,
          source: lead.source,
          status: lead.status,
          contact: lead.contact,
          notes: lead.notes,
          assignedTo: lead.assignedTo ?? null,
          vehicleInterest: lead.vehicleInterest ?? null,
          budget: lead.budget ?? null,
          createdBy: lead.createdBy,
          createdByAdmin: lead.createdByAdmin,
          createdAt: lead.createdAt.toISOString(),
          updatedAt: lead.updatedAt.toISOString(),
        },
        message: `Lead asignado a ${assignedToName} exitosamente`,
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return createErrorResponse(error.message || 'Error al crear lead', 500);
  }
}

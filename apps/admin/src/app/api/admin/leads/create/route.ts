import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-error-handler';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST - Admin crea un lead y lo asigna a dealer o seller
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const {
      // Información del lead
      name,
      email,
      phone,
      source,
      notes,
      vehicleInterest,
      budget,
      
      // Asignación
      assignmentType, // 'dealer' o 'seller'
      dealerId,
      sellerId,
    } = body;

    // Validaciones
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

    // Obtener información del dealer/seller para validar
    let tenantId: string;
    let assignedTo: string | undefined;
    let assignedToName: string;

    if (assignmentType === 'dealer') {
      // Buscar el tenant (dealer)
      const tenantDoc = await db.collection('tenants').doc(dealerId).get();
      if (!tenantDoc.exists) {
        return createErrorResponse('Dealer no encontrado', 404);
      }
      tenantId = dealerId;
      assignedTo = undefined; // El dealer lo asignará después
      assignedToName = tenantDoc.data()?.name || 'Dealer';
    } else {
      // Buscar el vendedor
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

    // Crear el lead
    const leadRef = db.collection('leads').doc();
    const leadData = {
      name,
      email: email || null,
      phone,
      source: source || 'admin_manual',
      status: 'new',
      notes: notes || '',
      vehicleInterest: vehicleInterest || null,
      budget: budget || null,
      tenantId,
      assignedTo: assignedTo || null,
      createdBy: auth.userId,
      createdByAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastContactDate: null,
      nextFollowUpDate: null,
    };

    await leadRef.set(leadData);

    // Crear notificación
    const notificationRef = db.collection('notifications').doc();
    await notificationRef.set({
      type: 'lead_created' as any,
      title: 'Nuevo Lead Asignado',
      message: assignmentType === 'dealer'
        ? `El admin te asignó un nuevo lead: ${name}`
        : `El admin te asignó un nuevo lead: ${name}`,
      userId: assignedTo || null, // Si es para dealer, será null
      tenantId,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        leadId: leadRef.id,
        leadName: name,
        assignedBy: 'admin',
      },
    });

    // Si se asignó a dealer, crear notificación para todos los admins del dealer
    if (assignmentType === 'dealer') {
      const dealerAdmins = await db
        .collection('users')
        .where('tenantId', '==', tenantId)
        .where('role', '==', 'dealer')
        .get();

      const notificationPromises = dealerAdmins.docs.map((doc) =>
        db.collection('notifications').add({
          type: 'lead_created' as any,
          title: 'Nuevo Lead Asignado',
          message: `El admin asignó un nuevo lead a tu concesionario: ${name}`,
          userId: doc.id,
          tenantId,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          data: {
            leadId: leadRef.id,
            leadName: name,
            assignedBy: 'admin',
          },
        })
      );

      await Promise.all(notificationPromises);
    }

    return createSuccessResponse(
      {
        lead: {
          id: leadRef.id,
          ...leadData,
          createdAt: new Date(),
          updatedAt: new Date(),
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



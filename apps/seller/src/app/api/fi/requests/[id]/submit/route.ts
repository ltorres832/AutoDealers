// API route para enviar una solicitud F&I al gerente F&I (Seller)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createNotification } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { EmailService } from '@autodealers/messaging';
import { SMSService } from '@autodealers/messaging';

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
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    submittedBy,
    sellerNotes: sellerNotes || currentData?.sellerNotes,
    history: [...currentHistory, historyEntry],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
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

    // Notificar al gerente F&I designado (sistema, email y SMS)
    try {
      // Obtener el tenant para ver si tiene un gerente F&I designado
      const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
      const tenantData = tenantDoc.data();
      
      // Obtener datos del cliente para el mensaje
      const clientDoc = await db
        .collection('tenants')
        .doc(user.tenantId)
        .collection('fi_clients')
        .doc((updatedRequest as any).clientId)
        .get();
      const clientData = clientDoc.data();
      const clientName = clientData?.name || 'Cliente';
      
      if (tenantData?.fiManagerId) {
        // Notificación en sistema
        await createNotification({
          tenantId: user.tenantId,
          userId: tenantData.fiManagerId,
          type: 'system_alert',
          title: 'Nueva Solicitud F&I',
          message: `Se ha enviado una nueva solicitud F&I para revisión - ${clientName}`,
          channels: ['system'],
          metadata: {
            requestId: id,
            action: 'fi_request_submitted',
          },
        });

        // Enviar email si está configurado
        if (tenantData?.fiManagerEmail) {
          try {
            const { getEmailCredentials } = await import('@autodealers/core/src/credentials');
            const emailCreds = await getEmailCredentials();
            if (emailCreds?.apiKey) {
              const emailProvider = emailCreds.apiKey.includes('re_') || emailCreds.apiKey.startsWith('re_') ? 'resend' : 'sendgrid';
              const emailService = new EmailService(emailCreds.apiKey, emailProvider);
              
              await emailService.sendEmail({
                tenantId: user.tenantId,
                channel: 'email',
                direction: 'outbound',
                from: emailCreds.fromAddress || 'noreply@autodealers.com',
                to: tenantData.fiManagerEmail,
                content: `
                  <h2>Nueva Solicitud F&I</h2>
                  <p>Se ha enviado una nueva solicitud F&I para revisión:</p>
                  <ul>
                    <li><strong>Cliente:</strong> ${clientName}</li>
                    <li><strong>Solicitud ID:</strong> ${id}</li>
                    <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
                  </ul>
                  <p>Por favor, revisa la solicitud en tu panel F&I.</p>
                `,
                metadata: {
                  subject: 'Nueva Solicitud F&I - Revisión Requerida',
                },
              });
            }
          } catch (emailError) {
            console.error('Error enviando email F&I:', emailError);
          }
        }

        // Enviar SMS si está configurado
        if (tenantData?.fiManagerPhone) {
          try {
            const { getTwilioCredentials } = await import('@autodealers/core/src/credentials');
            const twilioCreds = await getTwilioCredentials();
            if (twilioCreds?.accountSid && twilioCreds?.authToken && twilioCreds?.phoneNumber) {
              const smsService = new SMSService(
                twilioCreds.accountSid,
                twilioCreds.authToken,
                twilioCreds.phoneNumber
              );
              
              await smsService.sendSMS({
                tenantId: user.tenantId,
                channel: 'sms',
                direction: 'outbound',
                from: twilioCreds.phoneNumber,
                to: tenantData.fiManagerPhone,
                content: `Nueva Solicitud F&I: ${clientName}. Revisa en tu panel F&I.`,
              });
            }
          } catch (smsError) {
            console.error('Error enviando SMS F&I:', smsError);
          }
        }
      } else {
        // Si no hay gerente F&I designado, notificar a todos los dealers del tenant (comportamiento por defecto)
        const dealersSnapshot = await db
          .collection('users')
          .where('tenantId', '==', user.tenantId)
          .where('role', '==', 'dealer')
          .get();

        for (const dealerDoc of dealersSnapshot.docs) {
          await createNotification({
            tenantId: user.tenantId,
            userId: dealerDoc.id,
            type: 'system_alert',
            title: 'Nueva Solicitud F&I',
            message: `Se ha enviado una nueva solicitud F&I para revisión - ${clientName}`,
            channels: ['system'],
            metadata: {
              requestId: id,
              action: 'fi_request_submitted',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error enviando notificación F&I:', error);
      // No fallar si la notificación falla
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


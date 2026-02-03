// API route para enviar email externo desde F&I (ej: al banco)
// Las respuestas llegarán a la plataforma

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { EmailService } from '@autodealers/messaging';
import { getFIRequestById, getFIClientById } from '@autodealers/crm';
import * as admin from 'firebase-admin';

const db = getFirestore();

async function addFIRequestNoteDirect(
  tenantId: string,
  requestId: string,
  note: string,
  addedBy: string,
  isInternal: boolean = false
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es dealer o tiene permisos F&I
    const allowedRoles = ['dealer', 'master_dealer', 'manager', 'dealer_admin'];
    if (!allowedRoles.includes(user.role as string)) {
      return NextResponse.json(
        { error: 'No tienes permiso para enviar emails externos' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { to, subject, body: emailBody } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Email, asunto y mensaje son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la solicitud F&I existe
    const fiRequest = await getFIRequestById(user.tenantId!, id);
    if (!fiRequest) {
      return NextResponse.json(
        { error: 'Solicitud F&I no encontrada' },
        { status: 404 }
      );
    }

    const fiRequestAny = fiRequest as any;
    // Obtener datos del cliente
    const client = await getFIClientById(user.tenantId!, fiRequestAny.clientId);
    if (!client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener nombre del usuario desde Firestore
    const userDoc = await db.collection('users').doc(user.userId).get();
    const userName = userDoc.data()?.name || user.email || 'Usuario';

    // Obtener tenant para email de respuesta
    const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
    const tenantData = tenantDoc.data();

    // Generar email de respuesta único para recibir respuestas
    // Formato: fi-{requestId}-{token}@autodealers.com (o dominio configurado)
    const replyToken = db.collection('_').doc().id;
    const replyEmail = `fi-${id}-${replyToken}@${process.env.EMAIL_DOMAIN || 'autodealers.com'}`;

    // Guardar el mapeo de email de respuesta a solicitud F&I
    await db.collection('fi_email_replies').doc(replyToken).set({
      tenantId: user.tenantId,
      requestId: id,
      clientId: fiRequestAny.clientId,
      originalTo: to,
      originalSubject: subject,
      sentBy: user.userId,
      sentByName: userName,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      replyEmail,
    });

    // Enviar email
    try {
      const { getEmailCredentials } = await import('@autodealers/core/src/credentials');
      const emailCreds = await getEmailCredentials();
      if (!emailCreds?.apiKey) {
        return NextResponse.json(
          { error: 'Servicio de email no configurado' },
          { status: 500 }
        );
      }

      const emailProvider = emailCreds.apiKey.includes('re_') || emailCreds.apiKey.startsWith('re_') ? 'resend' : 'sendgrid';
      const emailService = new EmailService(emailCreds.apiKey, emailProvider);

      // Agregar información del cliente en el email
      const fullEmailBody = `
        ${emailBody}
        
        ---
        Información del Cliente:
        - Nombre: ${(client as any).name}
        - Teléfono: ${(client as any).phone}
        ${(client as any).email ? `- Email: ${(client as any).email}` : ''}
        - Solicitud ID: ${id}
      `;

      await emailService.sendEmail({
        tenantId: user.tenantId,
        channel: 'email',
        direction: 'outbound',
        from: replyEmail, // Usar el email de respuesta como remitente
        to,
        content: fullEmailBody,
        metadata: {
          subject,
          // Headers personalizados para identificar el email
          headers: {
            'X-FI-Request-ID': id,
            'X-FI-Reply-Token': replyToken,
            'Reply-To': replyEmail,
          },
        },
      });

      // Agregar nota en el historial de la solicitud
      await addFIRequestNoteDirect(
        user.tenantId!,
        id,
        `Email externo enviado a ${to}: ${subject}`,
        user.userId,
        true // Nota interna
      );

      // Guardar registro del email enviado
      await db
        .collection('tenants')
        .doc(user.tenantId)
        .collection('fi_requests')
        .doc(id)
        .collection('external_emails')
        .add({
          to,
          subject,
          body: emailBody,
          replyEmail,
          replyToken,
          sentBy: user.userId,
          sentByName: userName,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return NextResponse.json({
        success: true,
        message: 'Email enviado correctamente. Las respuestas llegarán a la plataforma.',
        replyEmail,
      });
    } catch (emailError: any) {
      console.error('Error enviando email externo:', emailError);
      return NextResponse.json(
        { error: `Error al enviar email: ${emailError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error en POST /api/fi/requests/[id]/send-external-email:', error);
    return NextResponse.json(
      { error: error.message || 'Error al enviar email externo' },
      { status: 500 }
    );
  }
}



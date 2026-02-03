// API route para recibir respuestas de emails externos (webhook)
// Este endpoint debe ser configurado en Resend/SendGrid como webhook

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { getFIRequestById, addFIRequestNote } from '@autodealers/crm';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    // Obtener datos del webhook (formato depende del proveedor)
    const body = await request.json();
    
    // Formato Resend
    if (body.type === 'email.replied' || body.type === 'email.bounced') {
      const replyEmail = body.data?.from_email || body.data?.from;
      const subject = body.data?.subject || '';
      const content = body.data?.text || body.data?.html || '';
      const replyTo = body.data?.to || body.data?.recipient || [];

      // Buscar el token en el email de respuesta
      // Formato: fi-{requestId}-{token}@domain.com
      const replyToEmail = Array.isArray(replyTo) ? replyTo[0] : replyTo;
      const match = replyToEmail?.match(/fi-([^-]+)-([^@]+)@/);
      
      if (!match) {
        console.warn('Email de respuesta no tiene formato válido:', replyToEmail);
        return NextResponse.json({ received: true });
      }

      const [, requestId, token] = match;

      // Buscar el mapeo del email
      const replyDoc = await db.collection('fi_email_replies').doc(token).get();
      if (!replyDoc.exists) {
        console.warn('Token de respuesta no encontrado:', token);
        return NextResponse.json({ received: true });
      }

      const replyData = replyDoc.data();
      if (!replyData) {
        return NextResponse.json({ received: true });
      }

      // Verificar que el requestId coincide
      if (replyData.requestId !== requestId) {
        console.warn('RequestId no coincide:', replyData.requestId, requestId);
        return NextResponse.json({ received: true });
      }

      // Agregar la respuesta a la solicitud F&I
      await addFIRequestNote(
        replyData.tenantId,
        requestId,
        'system', // Sistema automático
        `📧 Respuesta recibida de ${replyEmail}:\n\n${content}`,
        true // Nota interna
      );

      // Guardar el email completo en el historial
      await db
        .collection('tenants')
        .doc(replyData.tenantId)
        .collection('fi_requests')
        .doc(requestId)
        .collection('external_emails')
        .add({
          type: 'reply',
          from: replyEmail,
          subject,
          body: content,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          originalRequestId: replyData.originalTo,
        });

      // Notificar al gerente F&I
      try {
        const tenantDoc = await db.collection('tenants').doc(replyData.tenantId).get();
        const tenantData = tenantDoc.data();

        if (tenantData?.fiManagerId) {
          const { createNotification } = await import('@autodealers/core');
          await createNotification({
            tenantId: replyData.tenantId,
            userId: tenantData.fiManagerId,
            type: 'system_alert',
            title: 'Nueva Respuesta de Email Externo',
            message: `Respuesta recibida de ${replyEmail} para solicitud F&I ${requestId}`,
            channels: ['system'],
            metadata: {
              requestId,
              action: 'fi_external_email_reply',
            },
          });
        }
      } catch (notifError) {
        console.error('Error enviando notificación de respuesta:', notifError);
      }

      return NextResponse.json({ received: true, processed: true });
    }

    // Formato SendGrid (si se usa)
    if (body.event === 'inbound' || body.event === 'reply') {
      const replyEmail = body.from || body.from_email;
      const subject = body.subject || '';
      const content = body.text || body.html || '';
      const replyTo = body.to || body.recipient;

      // Similar lógica de parsing...
      const match = replyTo?.match(/fi-([^-]+)-([^@]+)@/);
      
      if (!match) {
        return NextResponse.json({ received: true });
      }

      const [, requestId, token] = match;

      const replyDoc = await db.collection('fi_email_replies').doc(token).get();
      if (!replyDoc.exists) {
        return NextResponse.json({ received: true });
      }

      const replyData = replyDoc.data();
      if (!replyData || replyData.requestId !== requestId) {
        return NextResponse.json({ received: true });
      }

      await addFIRequestNote(
        replyData.tenantId,
        requestId,
        'system',
        `📧 Respuesta recibida de ${replyEmail}:\n\n${content}`,
        true
      );

      await db
        .collection('tenants')
        .doc(replyData.tenantId)
        .collection('fi_requests')
        .doc(requestId)
        .collection('external_emails')
        .add({
          type: 'reply',
          from: replyEmail,
          subject,
          body: content,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return NextResponse.json({ received: true, processed: true });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error procesando respuesta de email:', error);
    // Siempre retornar 200 para que el webhook no se reintente infinitamente
    return NextResponse.json({ received: true, error: error.message });
  }
}

// También aceptar GET para verificación del webhook
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'FI Email Reply Webhook está activo',
    endpoint: '/api/fi/email-reply'
  });
}


// API route para subir documentos a una solicitud (público)

import { NextRequest, NextResponse } from 'next/server';
import { getDocumentRequestByToken, submitDocumentToRequest } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

export async function generateStaticParams() {
  return [];
}
import { EmailService } from '@autodealers/messaging';
import { SMSService } from '@autodealers/messaging';

const db = getFirestore();

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { type, name, url } = body;

    if (!type || !name || !url) {
      return NextResponse.json(
        { error: 'Tipo, nombre y URL del documento son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la solicitud existe
    const docRequest = await getDocumentRequestByToken(token);
    if (!docRequest) {
      return NextResponse.json(
        { error: 'Solicitud de documentos no encontrada o expirada' },
        { status: 404 }
      );
    }

    // Subir documento
    await submitDocumentToRequest(token, { type, name, url });

    // Obtener datos actualizados
    const updatedRequest = await getDocumentRequestByToken(token);

    // Notificar al que solicitó los documentos (F&I, seller, dealer)
    try {
      const tenantDoc = await db.collection('tenants').doc(docRequest.tenantId).get();
      const tenantData = tenantDoc.data();

      // Obtener datos del cliente
      const clientDoc = await db
        .collection('tenants')
        .doc(docRequest.tenantId)
        .collection('fi_clients')
        .doc(docRequest.clientId)
        .get();
      const clientData = clientDoc.data();
      const clientName = clientData?.name || 'Cliente';

      // Obtener datos del usuario que solicitó
      const requesterDoc = await db.collection('users').doc(docRequest.requestedBy).get();
      const requesterData = requesterDoc.data();
      const requesterEmail = requesterData?.email;
      const requesterPhone = requesterData?.phone;

      // Notificar por email si el gerente F&I tiene email configurado
      if (tenantData?.fiManagerEmail) {
        try {
          const { getEmailCredentials } = await import('@autodealers/core');
          const emailCreds = await getEmailCredentials();
          if (emailCreds?.apiKey) {
            const emailProvider = emailCreds.apiKey.includes('re_') || emailCreds.apiKey.startsWith('re_') ? 'resend' : 'sendgrid';
            const emailService = new EmailService(emailCreds.apiKey, emailProvider);
            
            await emailService.sendEmail({
              tenantId: docRequest.tenantId,
              channel: 'email',
              direction: 'outbound',
              from: emailCreds.fromAddress || 'noreply@autodealers.com',
              to: tenantData.fiManagerEmail,
              content: `
                <h2>Nuevo Documento Recibido</h2>
                <p>El cliente <strong>${clientName}</strong> ha subido un nuevo documento:</p>
                <ul>
                  <li><strong>Documento:</strong> ${name}</li>
                  <li><strong>Tipo:</strong> ${type}</li>
                  <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p>Puedes revisar el documento en la plataforma.</p>
              `,
              metadata: {
                subject: `Nuevo Documento Recibido - ${clientName}`,
              },
            });
          }
        } catch (emailError) {
          console.error('Error enviando email de documento:', emailError);
        }
      }

      // Notificar por SMS si el gerente F&I tiene teléfono configurado
      if (tenantData?.fiManagerPhone) {
        try {
          const { getTwilioCredentials } = await import('@autodealers/core');
          const twilioCreds = await getTwilioCredentials();
          if (twilioCreds?.accountSid && twilioCreds?.authToken && twilioCreds?.phoneNumber) {
            const smsService = new SMSService(
              twilioCreds.accountSid,
              twilioCreds.authToken,
              twilioCreds.phoneNumber
            );
            
            await smsService.sendSMS({
              tenantId: docRequest.tenantId,
              channel: 'sms',
              direction: 'outbound',
              from: twilioCreds.phoneNumber,
              to: tenantData.fiManagerPhone,
              content: `Nuevo documento recibido de ${clientName}: ${name}`,
            });
          }
        } catch (smsError) {
          console.error('Error enviando SMS de documento:', smsError);
        }
      }

      // También notificar al usuario que solicitó (si es diferente del gerente F&I)
      if (requesterEmail && requesterData?.id !== tenantData?.fiManagerId) {
        try {
          const { getEmailCredentials } = await import('@autodealers/core');
          const emailCreds = await getEmailCredentials();
          if (emailCreds?.apiKey) {
            const emailProvider = emailCreds.apiKey.includes('re_') || emailCreds.apiKey.startsWith('re_') ? 'resend' : 'sendgrid';
            const emailService = new EmailService(emailCreds.apiKey, emailProvider);
            
            await emailService.sendEmail({
              tenantId: docRequest.tenantId,
              channel: 'email',
              direction: 'outbound',
              from: emailCreds.fromAddress || 'noreply@autodealers.com',
              to: requesterEmail,
              content: `
                <h2>Nuevo Documento Recibido</h2>
                <p>El cliente <strong>${clientName}</strong> ha subido un nuevo documento:</p>
                <ul>
                  <li><strong>Documento:</strong> ${name}</li>
                  <li><strong>Tipo:</strong> ${type}</li>
                </ul>
                <p>Puedes revisar el documento en la plataforma.</p>
              `,
              metadata: {
                subject: `Nuevo Documento Recibido - ${clientName}`,
              },
            });
          }
        } catch (emailError) {
          console.error('Error enviando email al solicitante:', emailError);
        }
      }
    } catch (notifError) {
      console.error('Error enviando notificaciones de documento:', notifError);
      // No fallar si la notificación falla
    }

    return NextResponse.json({
      success: true,
      documentRequest: updatedRequest,
      message: 'Documento subido correctamente',
    });
  } catch (error: any) {
    console.error('Error en POST /api/fi/documents/[token]/submit:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir documento' },
      { status: 500 }
    );
  }
}


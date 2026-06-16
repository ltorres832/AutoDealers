// API route para enviar email externo desde F&I (ej: al banco) con PDF profesional adjunto

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { getFirestore } from '@autodealers/core';
import {
  generateAndStoreFIDocument,
  fiTemplateFilename,
  type FIDocumentTemplate,
} from '@autodealers/core';
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

function buildProfessionalEmailHtml(opts: {
  body: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  requestId: string;
  dealerName: string;
  hasAttachment: boolean;
}): string {
  const paragraphs = opts.body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.55;color:#1f2937;font-size:15px;">${p.replace(/</g, '&lt;')}</p>`)
    .join('');

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background:#0A0A0A;padding:20px 28px;">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:bold;">${opts.dealerName}</p>
          <p style="margin:6px 0 0;color:#ffe0df;font-size:13px;">Solicitud de financiamiento automotriz</p>
        </td></tr>
        <tr><td style="padding:28px;">${paragraphs}
          <table width="100%" style="margin-top:20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
            <tr><td style="padding:16px;">
              <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Datos del solicitante</p>
              <p style="margin:0;font-size:14px;color:#111827;"><strong>${opts.clientName}</strong></p>
              <p style="margin:4px 0 0;font-size:13px;color:#374151;">Tel: ${opts.clientPhone}${opts.clientEmail ? ` · ${opts.clientEmail}` : ''}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Ref. solicitud: ${opts.requestId}</p>
            </td></tr>
          </table>
          ${
            opts.hasAttachment
              ? `<p style="margin:20px 0 0;font-size:13px;color:#374151;">Se adjunta documento PDF con el paquete de solicitud para su análisis crediticio.</p>`
              : ''
          }
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.4;">Documento confidencial. Si recibió este correo por error, notifique al remitente.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
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

    const allowedRoles = ['dealer', 'master_dealer', 'manager', 'dealer_admin'];
    if (!allowedRoles.includes(user.role as string)) {
      return NextResponse.json(
        { error: 'No tienes permiso para enviar emails externos' },
        { status: 403 }
      );
    }

    const fiGate = await requireTenantFeature(user.tenantId, 'useFIModule');
    if (fiGate) return fiGate;

    const { id } = await params;
    const body = await request.json();
    const {
      to,
      subject,
      body: emailBody,
      attachPdf = true,
      pdfTemplate = 'lender_package',
    } = body as {
      to: string;
      subject: string;
      body: string;
      attachPdf?: boolean;
      pdfTemplate?: FIDocumentTemplate;
    };

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Email, asunto y mensaje son requeridos' },
        { status: 400 }
      );
    }

    const fiRequest = await getFIRequestById(user.tenantId!, id);
    if (!fiRequest) {
      return NextResponse.json({ error: 'Solicitud F&I no encontrada' }, { status: 404 });
    }

    const client = await getFIClientById(user.tenantId!, fiRequest.clientId);
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const userDoc = await db.collection('users').doc(user.userId).get();
    const userName = userDoc.data()?.name || user.email || 'Usuario';

    const tenantDoc = await db.collection('tenants').doc(user.tenantId).get();
    const tenantData = tenantDoc.data();
    const dealerName =
      (tenantData?.companyName as string) || (tenantData?.name as string) || 'Concesionario';

    const replyToken = db.collection('_').doc().id;
    const replyEmail = `fi-${id}-${replyToken}@${process.env.EMAIL_DOMAIN || 'autodealers.com'}`;

    await db.collection('fi_email_replies').doc(replyToken).set({
      tenantId: user.tenantId,
      requestId: id,
      clientId: fiRequest.clientId,
      originalTo: to,
      originalSubject: subject,
      sentBy: user.userId,
      sentByName: userName,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      replyEmail,
    });

    const emailAttachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
    let attachedPdfUrl: string | undefined;

    if (attachPdf) {
      const template = (pdfTemplate || 'lender_package') as FIDocumentTemplate;
      const stored = await generateAndStoreFIDocument({
        tenantId: user.tenantId,
        userId: user.userId,
        requestId: id,
        template,
        client,
        request: fiRequest,
      });
      attachedPdfUrl = stored.pdfUrl;
      emailAttachments.push({
        filename: stored.filename,
        content: stored.pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    try {
      const { getEmailCredentials } = await import('@autodealers/core/src/credentials');
      const emailCreds = await getEmailCredentials();
      if (!emailCreds?.apiKey) {
        return NextResponse.json(
          { error: 'Servicio de email no configurado' },
          { status: 500 }
        );
      }

      const emailProvider =
        emailCreds.apiKey.includes('re_') || emailCreds.apiKey.startsWith('re_')
          ? 'resend'
          : 'sendgrid';
      const emailService = new EmailService(emailCreds.apiKey, emailProvider);

      const html = buildProfessionalEmailHtml({
        body: emailBody,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        requestId: id,
        dealerName,
        hasAttachment: emailAttachments.length > 0,
      });

      const sendResult = await emailService.sendEmail({
        tenantId: user.tenantId,
        channel: 'email',
        direction: 'outbound',
        from: emailCreds.fromAddress || replyEmail,
        to,
        content: html,
        emailAttachments,
        metadata: {
          subject,
          headers: {
            'X-FI-Request-ID': id,
            'X-FI-Reply-Token': replyToken,
            'Reply-To': replyEmail,
          },
        },
      });

      if (sendResult.status === 'failed') {
        return NextResponse.json(
          { error: sendResult.error || 'Error al enviar email' },
          { status: 502 }
        );
      }

      const attachmentNote = attachPdf
        ? ` con PDF adjunto (${fiTemplateFilename(pdfTemplate || 'lender_package', client.name)})`
        : '';

      await addFIRequestNoteDirect(
        user.tenantId!,
        id,
        `Email externo enviado a ${to}: ${subject}${attachmentNote}`,
        user.userId,
        true
      );

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
          attachPdf: !!attachPdf,
          pdfTemplate: attachPdf ? pdfTemplate || 'lender_package' : null,
          attachedPdfUrl: attachedPdfUrl || null,
          sentBy: user.userId,
          sentByName: userName,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return NextResponse.json({
        success: true,
        message: attachPdf
          ? 'Email enviado con documento PDF profesional adjunto. Las respuestas llegarán a la plataforma.'
          : 'Email enviado correctamente. Las respuestas llegarán a la plataforma.',
        replyEmail,
        attachedPdfUrl,
      });
    } catch (emailError: unknown) {
      console.error('Error enviando email externo:', emailError);
      return NextResponse.json(
        {
          error: `Error al enviar email: ${emailError instanceof Error ? emailError.message : 'Error desconocido'}`,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Error en POST /api/fi/requests/[id]/send-external-email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al enviar email externo' },
      { status: 500 }
    );
  }
}

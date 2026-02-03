// API route para solicitar documentos a un cliente (Dealer/F&I)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createDocumentRequest, getFIRequestById, getFIClientById } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';
import { EmailService } from '@autodealers/messaging';

const db = getFirestore();

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
        { error: 'No tienes permiso para solicitar documentos' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { requestedDocuments, expiresInDays } = body;

    if (!requestedDocuments || !Array.isArray(requestedDocuments) || requestedDocuments.length === 0) {
      return NextResponse.json(
        { error: 'Debes especificar al menos un documento a solicitar' },
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

    // Crear solicitud de documentos
    const docRequest = await createDocumentRequest(
      user.tenantId!,
      id,
      fiRequestAny.clientId,
      requestedDocuments,
      user.userId,
      expiresInDays || 7
    );

    // Generar link público
    const publicUrl = `${process.env.NEXT_PUBLIC_PUBLIC_WEB_URL || 'http://localhost:3000'}/fi/documents/${docRequest.token}`;

    // Enviar email al cliente con el link
    try {
      if (client.email) {
        const { getEmailCredentials } = await import('@autodealers/core/src/credentials');
        const emailCreds = await getEmailCredentials();
        if (emailCreds?.apiKey) {
          const emailProvider = emailCreds.apiKey.includes('re_') || emailCreds.apiKey.startsWith('re_') ? 'resend' : 'sendgrid';
          const emailService = new EmailService(emailCreds.apiKey, emailProvider);
          
          const documentsList = requestedDocuments.map((doc: any) => 
            `- ${doc.name}${doc.description ? ` (${doc.description})` : ''}`
          ).join('<br>');

          await emailService.sendEmail({
            tenantId: user.tenantId,
            channel: 'email',
            direction: 'outbound',
            from: emailCreds.fromAddress || 'noreply@autodealers.com',
            to: client.email,
            content: `
              <h2>Solicitud de Documentos</h2>
              <p>Hola <strong>${client.name}</strong>,</p>
              <p>Necesitamos que nos proporciones los siguientes documentos para continuar con tu solicitud de financiamiento:</p>
              <ul>
                ${documentsList}
              </ul>
              <p>Por favor, haz clic en el siguiente link para subir los documentos:</p>
              <p><a href="${publicUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Subir Documentos</a></p>
              <p>O copia y pega este link en tu navegador:</p>
              <p style="word-break: break-all;">${publicUrl}</p>
              <p><strong>Esta solicitud expira el:</strong> ${new Date(docRequest.expiresAt).toLocaleDateString()}</p>
              <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            `,
            metadata: {
              subject: 'Solicitud de Documentos - Financiamiento',
            },
          });
        }
      }
    } catch (emailError) {
      console.error('Error enviando email al cliente:', emailError);
      // No fallar si el email falla, pero informar al usuario
    }

    return NextResponse.json({
      success: true,
      documentRequest: docRequest,
      publicUrl,
      message: 'Solicitud de documentos creada. El cliente recibirá un email con el link.',
    });
  } catch (error: any) {
    console.error('Error en POST /api/fi/requests/[id]/request-documents:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear solicitud de documentos' },
      { status: 500 }
    );
  }
}


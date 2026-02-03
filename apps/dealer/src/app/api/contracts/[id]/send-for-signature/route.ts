export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getContractById, sendContractForSignature } from '@autodealers/crm';
import { EmailService } from '@autodealers/messaging';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { signerEmail, signerName, signerPhone } = body;

    if (!signerEmail || !signerName) {
      return NextResponse.json(
        { error: 'signerEmail and signerName are required' },
        { status: 400 }
      );
    }

    const { id: contractId } = await params;
    const contract = await getContractById(auth.tenantId!, contractId);
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Enviar contrato para firma
    const { token, url } = await sendContractForSignature(
      auth.tenantId!,
      contractId,
      signerEmail, // Usar email como ID temporal
      signerEmail,
      signerName,
      signerPhone
    );

    // Enviar email con enlace de firma
    try {
      const emailService = new EmailService(
        process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || '',
        process.env.RESEND_API_KEY ? 'resend' : 'sendgrid'
      );

      await emailService.sendEmail({
        tenantId: auth.tenantId!,
        channel: 'email',
        direction: 'outbound',
        from: 'noreply@autodealers.com',
        to: signerEmail,
        content: `
          <h2>Firma de Contrato: ${contract.name}</h2>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Solicitud de Firma de Contrato</h2>
            <p>Estimado/a ${signerName},</p>
            <p>Se requiere tu firma en el siguiente contrato:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Contrato:</strong> ${contract.name}</p>
              <p><strong>Tipo:</strong> ${contract.type}</p>
            </div>
            <p>Por favor, haz clic en el siguiente enlace para revisar y firmar el contrato:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Firmar Contrato
              </a>
            </div>
            <p style="color: #6b7280; font-size: 12px;">
              Este enlace expirará en 7 días. Si no solicitaste este documento, puedes ignorar este email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continuar aunque falle el email
    }

    return NextResponse.json({ 
      success: true,
      token,
      url,
      message: 'Contrato enviado para firma. El cliente recibirá un email con el enlace.',
    });
  } catch (error: any) {
    console.error('Error sending contract for signature:', error);
    return NextResponse.json(
      { error: error.message || 'Error al enviar contrato para firma' },
      { status: 500 }
    );
  }
}


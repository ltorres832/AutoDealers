import { EmailService } from '@autodealers/messaging';
import { getEmailCredentials } from './credentials';

export async function sendAdminWelcomeEmail(params: {
  email: string;
  name: string;
  roleLabel: string;
  loginUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const emailCreds = await getEmailCredentials();
    const emailApiKey = emailCreds.apiKey || '';

    if (!emailApiKey) {
      return { sent: false, error: 'Email API Key no configurada' };
    }

    const provider =
      emailApiKey.includes('re_') || emailApiKey.startsWith('re_') ? 'resend' : 'sendgrid';

    const emailService = new EmailService(emailApiKey, provider);
    const from = emailCreds.fromAddress || 'noreply@autodealers.com';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
        <h2 style="color: #4f46e5;">Bienvenido a AutoDealers</h2>
        <p>Hola <strong>${params.name}</strong>,</p>
        <p>Tu cuenta de <strong>${params.roleLabel}</strong> fue creada. Ya puedes acceder a la plataforma.</p>
        <p style="margin: 24px 0;">
          <a href="${params.loginUrl}" style="background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Iniciar sesión
          </a>
        </p>
        <p style="font-size: 14px; color: #444;">
          URL de acceso: <a href="${params.loginUrl}">${params.loginUrl}</a>
        </p>
        <p style="font-size: 14px; color: #444; margin-top: 20px;">
          Usa el <strong>email</strong> y la <strong>contraseña temporal</strong> que te entregó tu administrador.
          Por seguridad, al entrar por primera vez se te pedirá <strong>cambiar la contraseña</strong>.
        </p>
        <p style="font-size: 12px; color: #888; margin-top: 24px;">
          No respondas a este correo. Si no solicitaste esta cuenta, contacta a soporte.
        </p>
      </div>
    `;

    const result = await emailService.sendEmail({
      tenantId: 'platform',
      channel: 'email',
      direction: 'outbound',
      from,
      to: params.email,
      content: html,
      metadata: { subject: 'Bienvenido a AutoDealers — accede a tu cuenta' },
    });

    if (result.status === 'failed') {
      return { sent: false, error: result.error || 'Error al enviar email' };
    }

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('sendAdminWelcomeEmail:', message);
    return { sent: false, error: message };
  }
}

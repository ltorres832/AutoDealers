import { PLATFORM_NAME } from '@autodealers/shared/platform-sender';
import { sendConfiguredEmail } from './email-delivery';
import { normalizeLoginEmail } from './user-auth-sync';
import { AuthAppKey, createAppPasswordReset } from './app-passwords';

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmailFormat(email: string): boolean {
  return email.length >= 5 && email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendPasswordResetEmailViaProvider(params: {
  email: string;
  appName: string;
  appBaseUrl: string;
  appKey?: AuthAppKey;
  actionBaseUrl?: string;
  loginPath?: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const email = normalizeLoginEmail(String(params.email || ''));
  if (!isValidEmailFormat(email)) {
    return { sent: false, error: 'Correo electrónico inválido' };
  }

  const baseUrl = String(params.appBaseUrl || '').trim().replace(/\/$/, '');
  if (!baseUrl) {
    return { sent: false, error: 'URL de la aplicación no configurada' };
  }

  const loginPath = params.loginPath || '/login';
  const continueUrl = `${baseUrl}${loginPath.startsWith('/') ? loginPath : `/${loginPath}`}`;

  let link: string;
  try {
    const appKey = params.appKey || 'public';
    const reset = await createAppPasswordReset({
      appKey,
      email,
    });
    if (reset.skipped || !reset.token) return { sent: true, skipped: true };
    link = buildBrandedActionLink(reset.token, appKey, params.actionBaseUrl || baseUrl, continueUrl);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el enlace';
    console.error('sendPasswordResetEmailViaProvider link:', message);
    return { sent: false, error: message };
  }

  try {
    const appName = params.appName || PLATFORM_NAME;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h2 style="color: #4f46e5;">Restablece tu contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>${escapeHtml(appName)}</strong>.</p>
        <p>Este cambio aplica únicamente a esta app. No cambia la contraseña de los otros portales de AutoDealersOnline.</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(link)}" style="background: #4f46e5; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700;">
            Restablecer contraseña
          </a>
        </p>
        <p style="font-size: 14px; color: #4b5563;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:
          <br />
          <a href="${escapeHtml(link)}" style="color: #4f46e5; word-break: break-all;">${escapeHtml(link)}</a>
        </p>
        <p style="font-size: 14px; color: #4b5563; margin-top: 20px;">
          Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual seguirá igual.
        </p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
          Este enlace vence automáticamente por seguridad.
        </p>
      </div>
    `;

    const result = await sendConfiguredEmail({
      to: email,
      subject: `Restablece tu contraseña de ${appName}`,
      html,
    });

    if (!result.sent) {
      return { sent: false, error: result.error || 'Error al enviar email' };
    }

    return { sent: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('sendPasswordResetEmailViaProvider email:', message);
    return { sent: false, error: message };
  }
}

function buildBrandedActionLink(
  token: string,
  appKey: AuthAppKey,
  actionBaseUrl: string,
  continueUrl: string
): string {
  const actionBase = String(actionBaseUrl || '').trim().replace(/\/$/, '');
  if (!actionBase) {
    return `${continueUrl}?appResetToken=${encodeURIComponent(token)}&appKey=${encodeURIComponent(appKey)}`;
  }

  try {
    const target = new URL('/auth/reset-password', actionBase);
    target.searchParams.set('appResetToken', token);
    target.searchParams.set('appKey', appKey);
    target.searchParams.set('continueUrl', continueUrl);
    return target.toString();
  } catch {
    return `${continueUrl}?appResetToken=${encodeURIComponent(token)}&appKey=${encodeURIComponent(appKey)}`;
  }
}

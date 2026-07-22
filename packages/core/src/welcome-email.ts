import { EmailService } from '@autodealers/messaging';
import {
  formatPlatformEmailFrom,
  PLATFORM_NAME,
} from '@autodealers/shared/platform-sender';
import {
  resolveAdminUrl,
  resolveDealerUrl,
  resolvePublicWebUrl,
  resolveSellerUrl,
} from '@autodealers/shared/platform-urls';
import { getEmailCredentials } from './credentials';
import {
  buildWhatsAppUrl,
  getPlatformSupportContact,
  PLATFORM_SUPPORT_WHATSAPP_OPTIONS,
  resolveInAppSupportUrl,
} from './platform-support';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveLoginUrl(role: string): string {
  const base =
    role === 'dealer' || role === 'dealer_admin' || role === 'manager'
      ? resolveDealerUrl()
      : role === 'seller'
        ? resolveSellerUrl()
        : role === 'admin'
          ? resolveAdminUrl()
          : role === 'affiliate'
            ? `${resolvePublicWebUrl()}/affiliate/login`
            : resolveSellerUrl();

  return role === 'affiliate' ? base : `${base}/login`;
}

function resolveRoleLabel(role: string): string {
  if (role === 'dealer' || role === 'dealer_admin' || role === 'manager') return 'Panel dealer';
  if (role === 'seller') return 'Panel vendedor';
  if (role === 'admin') return 'Panel administrador';
  if (role === 'affiliate') return 'Portal de afiliados';
  return 'Panel';
}

function buildSupportSectionHtml(params: {
  email: string;
  whatsapp: string | null;
  hours: string | null;
  supportInAppUrl?: string;
}): string {
  const lines: string[] = [];

  lines.push(
    '<p style="margin: 0 0 8px;">Si tienes algún problema con la plataforma, dudas o preguntas, nuestro equipo de soporte está disponible para ayudarte:</p>'
  );
  lines.push('<ul style="margin: 0; padding-left: 20px; line-height: 1.8;">');

  lines.push(
    `<li><strong>Email:</strong> <a href="mailto:${escapeHtml(params.email)}">${escapeHtml(params.email)}</a></li>`
  );

  if (params.whatsapp) {
    const waLinks = PLATFORM_SUPPORT_WHATSAPP_OPTIONS.map((option) => {
      const waUrl = buildWhatsAppUrl(params.whatsapp!, option.message);
      return waUrl
        ? `<li><a href="${waUrl}">${escapeHtml(option.label)}</a></li>`
        : '';
    }).filter(Boolean);

    if (waLinks.length > 0) {
      lines.push(`<li><strong>WhatsApp:</strong><ul>${waLinks.join('')}</ul></li>`);
    }
  }

  if (params.supportInAppUrl) {
    lines.push(
      `<li><strong>Soporte en tu cuenta:</strong> <a href="${escapeHtml(params.supportInAppUrl)}">Configuración → Soporte</a></li>`
    );
  }

  lines.push('</ul>');

  if (params.hours) {
    lines.push(
      `<p style="margin: 8px 0 0; font-size: 13px; color: #64748b;">Horario de atención: ${escapeHtml(params.hours)}</p>`
    );
  }

  return `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="margin: 0 0 12px; font-weight: bold; color: #334155;">¿Necesitas ayuda?</p>
      ${lines.join('\n')}
    </div>
  `;
}

export async function sendAdminWelcomeEmail(params: {
  email: string;
  name: string;
  roleLabel: string;
  loginUrl: string;
  createdByAdmin?: boolean;
  supportInAppUrl?: string;
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
    const from = formatPlatformEmailFrom(emailCreds.fromAddress);

    const support = await getPlatformSupportContact();
    const supportHtml = buildSupportSectionHtml({
      email: support.email,
      whatsapp: support.whatsapp,
      hours: support.hours,
      supportInAppUrl: params.supportInAppUrl,
    });

    const passwordNote =
      params.createdByAdmin !== false
        ? `Usa el <strong>email</strong> y la <strong>contraseña temporal</strong> que te entregó tu administrador.
          Por seguridad, al entrar por primera vez se te pedirá <strong>cambiar la contraseña</strong>.`
        : `Usa el <strong>email</strong> y la <strong>contraseña</strong> que registraste al crear tu cuenta.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
        <h2 style="color: #4f46e5;">Bienvenido a ${PLATFORM_NAME}</h2>
        <p>Hola <strong>${escapeHtml(params.name)}</strong>,</p>
        <p>Tu cuenta de <strong>${escapeHtml(params.roleLabel)}</strong> fue creada. Ya puedes acceder a la plataforma.</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(params.loginUrl)}" style="background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Iniciar sesión
          </a>
        </p>
        <p style="font-size: 14px; color: #444;">
          URL de acceso: <a href="${escapeHtml(params.loginUrl)}">${escapeHtml(params.loginUrl)}</a>
        </p>
        <p style="font-size: 14px; color: #444; margin-top: 20px;">
          ${passwordNote}
        </p>
        ${supportHtml}
        <p style="font-size: 12px; color: #888; margin-top: 24px;">
          No respondas a este correo automático. Si no solicitaste esta cuenta, contacta a soporte.
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
      metadata: { subject: `Bienvenido a ${PLATFORM_NAME} — accede a tu cuenta` },
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

export async function sendWelcomeEmailForRole(params: {
  email: string;
  name: string;
  role: string;
  createdByAdmin?: boolean;
}): Promise<{ sent: boolean; error?: string }> {
  return sendAdminWelcomeEmail({
    email: params.email,
    name: params.name,
    roleLabel: resolveRoleLabel(params.role),
    loginUrl: resolveLoginUrl(params.role),
    createdByAdmin: params.createdByAdmin,
    supportInAppUrl: resolveInAppSupportUrl(params.role),
  });
}

export async function sendAffiliateWelcomeEmail(params: {
  email: string;
  name: string;
  referralCode: string;
  referralLink: string;
  createdByAdmin?: boolean;
  temporaryPassword?: string;
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
    const from = formatPlatformEmailFrom(emailCreds.fromAddress);
    const loginUrl = resolveLoginUrl('affiliate');

    const support = await getPlatformSupportContact();
    const supportHtml = buildSupportSectionHtml({
      email: support.email,
      whatsapp: support.whatsapp,
      hours: support.hours,
    });

    const passwordNote = params.temporaryPassword
      ? `Tu contraseña temporal es: <strong>${escapeHtml(params.temporaryPassword)}</strong>. Cámbiala al iniciar sesión.`
      : params.createdByAdmin === false
        ? 'Usa el <strong>email</strong> y la <strong>contraseña</strong> que registraste.'
        : 'Usa el <strong>email</strong> y la contraseña que te proporcionó el administrador.';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
        <h2 style="color: #4f46e5;">Bienvenido al programa de afiliados</h2>
        <p>Hola <strong>${escapeHtml(params.name)}</strong>,</p>
        <p>Tu cuenta de afiliado en ${PLATFORM_NAME} está lista. Comparte tu enlace y gana comisión cuando alguien se registre como dealer o vendedor.</p>
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-weight: bold;">Tu código de referido</p>
          <p style="margin: 0; font-size: 22px; letter-spacing: 2px; font-weight: bold;">${escapeHtml(params.referralCode)}</p>
          <p style="margin: 12px 0 0; font-size: 14px;">
            Enlace para compartir:<br/>
            <a href="${escapeHtml(params.referralLink)}">${escapeHtml(params.referralLink)}</a>
          </p>
        </div>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(loginUrl)}" style="background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Entrar al portal de afiliados
          </a>
        </p>
        <p style="font-size: 14px; color: #444;">${passwordNote}</p>
        ${supportHtml}
        <p style="font-size: 12px; color: #888; margin-top: 24px;">
          No respondas a este correo automático.
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
      metadata: { subject: `Bienvenido al programa de afiliados — ${PLATFORM_NAME}` },
    });

    if (result.status === 'failed') {
      return { sent: false, error: result.error || 'Error al enviar email' };
    }

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('sendAffiliateWelcomeEmail:', message);
    return { sent: false, error: message };
  }
}

export async function sendAffiliateConnectRequiredEmail(params: {
  email: string;
  name: string;
  pendingAmount?: number;
  currency?: string;
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
    const from = formatPlatformEmailFrom(emailCreds.fromAddress);
    const connectUrl = `${resolvePublicWebUrl().replace(/\/$/, '')}/affiliate/dashboard?tab=payout`;

    const amountLine =
      params.pendingAmount != null && params.pendingAmount > 0
        ? `<p>Tienes comisiones pendientes por <strong>$${params.pendingAmount.toFixed(2)} ${(params.currency || 'USD').toUpperCase()}</strong> esperando tu cuenta Stripe.</p>`
        : '<p>Tienes comisiones aprobadas esperando tu cuenta Stripe.</p>';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
        <h2 style="color: #4f46e5;">Conecta Stripe para recibir tus comisiones</h2>
        <p>Hola <strong>${escapeHtml(params.name)}</strong>,</p>
        ${amountLine}
        <p>Los pagos a afiliados se transfieren automáticamente cada <strong>lunes</strong> vía Stripe Connect. Conecta tu cuenta bancaria para no perder el próximo ciclo.</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(connectUrl)}" style="background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Conectar cuenta Stripe
          </a>
        </p>
        <p style="font-size: 12px; color: #888; margin-top: 24px;">
          No respondas a este correo automático.
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
      metadata: { subject: `Acción requerida: conecta Stripe — ${PLATFORM_NAME}` },
    });

    if (result.status === 'failed') {
      return { sent: false, error: result.error || 'Error al enviar email' };
    }

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('sendAffiliateConnectRequiredEmail:', message);
    return { sent: false, error: message };
  }
}

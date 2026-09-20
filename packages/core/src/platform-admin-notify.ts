import { PLATFORM_NAME } from '@autodealers/shared/platform-sender';
import { resolveAdminUrl } from '@autodealers/shared/platform-urls';
import { getFirestore } from '@autodealers/shared';
import { getContactNotifyEmail } from './contact-inquiries';
import { sendOutboundEmail } from './messaging-outbound';
import { notifyPlatformAdmins, type PlatformAdminAudience } from './notifications';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type PlatformRegistrationKind = 'dealer' | 'seller' | 'affiliate' | 'advertiser' | 'business';

const REGISTRATION_LABELS: Record<PlatformRegistrationKind, string> = {
  dealer: 'Concesionario',
  seller: 'Vendedor',
  affiliate: 'Afiliado',
  advertiser: 'Anunciante',
  business: 'Negocio automotriz',
};

export async function notifyPlatformAdminsOfRegistration(params: {
  kind: PlatformRegistrationKind;
  name: string;
  email: string;
  title: string;
  message: string;
  adminRoute: string;
  audience?: PlatformAdminAudience;
  metadata?: Record<string, string>;
  details?: Array<{ label: string; value: string }>;
}): Promise<void> {
  const adminRoute = params.adminRoute.startsWith('/')
    ? params.adminRoute
    : `/${params.adminRoute}`;
  const detailUrl = `${resolveAdminUrl()}${adminRoute}`;
  const metadata = {
    ...params.metadata,
    route: adminRoute,
    registrationKind: params.kind,
  };

  await notifyPlatformAdmins({
    type: 'system_alert',
    title: params.title,
    message: params.message,
    audience: params.audience ?? 'platform',
    metadata,
  });

  const detailRows =
    params.details
      ?.filter((d) => d.value?.trim())
      .map(
        (d) =>
          `<p style="margin: 0 0 8px;"><strong>${escapeHtml(d.label)}:</strong> ${escapeHtml(d.value)}</p>`
      )
      .join('') || '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111; line-height: 1.6;">
      <div style="border-bottom: 3px solid #E10600; padding-bottom: 12px; margin-bottom: 20px;">
        <strong style="font-size: 18px;">${PLATFORM_NAME}</strong>
        <div style="font-size: 12px; color: #64748b;">Nuevo registro — ${escapeHtml(REGISTRATION_LABELS[params.kind])}</div>
      </div>
      <p><strong>${escapeHtml(params.title)}</strong></p>
      <p>${escapeHtml(params.message)}</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Nombre:</strong> ${escapeHtml(params.name)}</p>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(params.email)}">${escapeHtml(params.email)}</a></p>
        ${detailRows}
      </div>
      <p style="margin-top: 24px;">
        <a href="${detailUrl}" style="display: inline-block; background: #E10600; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver en el panel admin</a>
      </p>
    </div>
  `;

  const subject = `[${PLATFORM_NAME}] ${params.title}`;

  const notifyTo = await getContactNotifyEmail();
  const platformResult = await sendOutboundEmail(notifyTo, subject, html, 'platform');
  if (!platformResult.success) {
    console.warn('[platform-admin-notify] platform email failed:', platformResult.error);
  }

  const adminEmails = await listPlatformAdminEmails();
  await Promise.all(
    adminEmails
      .filter((adminEmail) => adminEmail.toLowerCase() !== notifyTo.toLowerCase())
      .map(async (adminEmail) => {
        const result = await sendOutboundEmail(adminEmail, subject, html, 'platform');
        if (!result.success) {
          console.warn(`[platform-admin-notify] admin email failed (${adminEmail}):`, result.error);
        }
      })
  );
}

async function listPlatformAdminEmails(): Promise<string[]> {
  const db = getFirestore();
  const emails = new Set<string>();

  const [usersSnap, adminUsersSnap] = await Promise.all([
    db.collection('users').where('role', '==', 'admin').get(),
    db.collection('admin_users').get(),
  ]);

  for (const doc of usersSnap.docs) {
    const data = doc.data() || {};
    if (data.isActive === false || data.status === 'cancelled') continue;
    const email = String(data.email || '').trim().toLowerCase();
    if (email.includes('@')) emails.add(email);
  }

  for (const doc of adminUsersSnap.docs) {
    const data = doc.data() || {};
    if (data.isActive === false) continue;
    const email = String(data.email || '').trim().toLowerCase();
    if (email.includes('@')) emails.add(email);
  }

  return Array.from(emails);
}

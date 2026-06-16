import * as admin from 'firebase-admin';
import { getFirestore } from '@autodealers/shared';
import { sendOutboundEmail } from './messaging-outbound';
import { notifyPlatformAdmins } from './notifications';

export type ContactInquiryStatus = 'new' | 'read' | 'replied' | 'archived';
export type ContactInquiryBusinessType = 'dealer' | 'seller' | 'other' | 'advertiser';

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  businessType: ContactInquiryBusinessType;
  message: string;
  status: ContactInquiryStatus;
  source: string;
  adminNotes?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

const COLLECTION = 'contact_inquiries';

function mapDoc(id: string, data: FirebaseFirestore.DocumentData): ContactInquiry {
  const ts = (v: unknown): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
      return (v as { toDate: () => Date }).toDate();
    }
    return null;
  };

  return {
    id,
    name: String(data.name || ''),
    email: String(data.email || ''),
    phone: data.phone ? String(data.phone) : null,
    businessType: (data.businessType as ContactInquiryBusinessType) || 'other',
    message: String(data.message || ''),
    status: (data.status as ContactInquiryStatus) || 'new',
    source: String(data.source || 'public_contact_form'),
    adminNotes: data.adminNotes ? String(data.adminNotes) : null,
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
  };
}

export async function getContactNotifyEmail(): Promise<string> {
  const db = getFirestore();

  try {
    const siteDoc = await db.collection('site_config').doc('public_site_info').get();
    const contact = siteDoc.data()?.contact as { email?: string } | undefined;
    if (contact?.email?.includes('@')) return contact.email.trim();
  } catch {
    /* non-critical */
  }

  const env = process.env.CONTACT_NOTIFY_EMAIL?.trim();
  if (env?.includes('@')) return env;

  try {
    const mainDoc = await db.collection('system_settings').doc('main').get();
    const platformEmail = mainDoc.data()?.platformEmail;
    if (typeof platformEmail === 'string' && platformEmail.includes('@')) {
      return platformEmail.trim();
    }
  } catch {
    /* non-critical */
  }

  return 'info@autodealers.com';
}

export async function listContactInquiries(options?: {
  status?: ContactInquiryStatus | 'all';
  limit?: number;
}): Promise<ContactInquiry[]> {
  const db = getFirestore();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 300);

  let q = db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(limit) as admin.firestore.Query;

  if (options?.status && options.status !== 'all') {
    q = db
      .collection(COLLECTION)
      .where('status', '==', options.status)
      .orderBy('createdAt', 'desc')
      .limit(limit);
  }

  const snap = await q.get();
  return snap.docs.map((d) => mapDoc(d.id, d.data()));
}

export async function updateContactInquiry(
  id: string,
  patch: { status?: ContactInquiryStatus; adminNotes?: string | null }
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Mensaje no encontrado');

  await ref.update({
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.adminNotes !== undefined ? { adminNotes: patch.adminNotes } : {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function notifyAdminsOfContactInquiry(inquiry: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  businessType: string;
  message: string;
  source: string;
}): Promise<void> {
  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ||
    'https://admin-app--autodealers-7f62e.us-central1.hosted.app';
  const detailUrl = `${adminUrl.replace(/\/$/, '')}/admin/contact-inquiries`;

  const title = `Nuevo mensaje de contacto: ${inquiry.name}`;
  const summary = inquiry.message.length > 120 ? `${inquiry.message.slice(0, 120)}…` : inquiry.message;

  await notifyPlatformAdmins({
    type: 'system_alert',
    title,
    message: `${inquiry.email}${inquiry.phone ? ` · ${inquiry.phone}` : ''} — ${summary}`,
    metadata: {
      contactInquiryId: inquiry.id,
      route: '/admin/contact-inquiries',
    },
  });

  const notifyTo = await getContactNotifyEmail();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111; line-height: 1.6;">
      <div style="border-bottom: 3px solid #E10600; padding-bottom: 12px; margin-bottom: 20px;">
        <strong style="font-size: 18px;">AutoDealers</strong>
        <div style="font-size: 12px; color: #64748b;">Nuevo mensaje del formulario de contacto</div>
      </div>
      <p><strong>Nombre:</strong> ${escapeHtml(inquiry.name)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></p>
      ${inquiry.phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(inquiry.phone)}</p>` : ''}
      <p><strong>Tipo:</strong> ${escapeHtml(inquiry.businessType)}</p>
      <p><strong>Origen:</strong> ${escapeHtml(inquiry.source)}</p>
      <p><strong>Mensaje:</strong></p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; white-space: pre-wrap;">${escapeHtml(inquiry.message)}</div>
      <p style="margin-top: 24px;">
        <a href="${detailUrl}" style="display: inline-block; background: #E10600; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver en el panel admin</a>
      </p>
    </div>
  `;

  const result = await sendOutboundEmail(
    notifyTo,
    `[AutoDealers] Nuevo contacto: ${inquiry.name}`,
    html,
    'platform'
  );

  if (!result.success) {
    console.warn('[contact-inquiries] Email notify failed:', result.error);
  }
}

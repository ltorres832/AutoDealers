/**
 * Listado, share tokens y entrega de documentos generados.
 */
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { randomBytes } from 'crypto';
import type { GeneratedDocument, DocumentStatus } from './types';

function getDb() {
  return getFirestore();
}

function mapDoc(id: string, data: any): GeneratedDocument {
  return {
    ...(data as Omit<GeneratedDocument, 'id' | 'createdAt' | 'updatedAt'>),
    id,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    shareExpiresAt: data.shareExpiresAt?.toDate?.() || data.shareExpiresAt || null,
  };
}

export async function listGeneratedDocuments(
  tenantId: string,
  opts?: { status?: DocumentStatus; limit?: number }
): Promise<GeneratedDocument[]> {
  let q: any = getDb().collection('tenants').doc(tenantId).collection('generated_documents');
  if (opts?.status) q = q.where('status', '==', opts.status);
  q = q.orderBy('createdAt', 'desc').limit(opts?.limit || 100);
  try {
    const snap = await q.get();
    return snap.docs.map((d: any) => mapDoc(d.id, d.data()));
  } catch {
    // Fallback sin índice compuesto
    const snap = await getDb()
      .collection('tenants')
      .doc(tenantId)
      .collection('generated_documents')
      .limit(opts?.limit || 100)
      .get();
    let list = snap.docs.map((d: any) => mapDoc(d.id, d.data()));
    if (opts?.status) list = list.filter((d) => d.status === opts.status);
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export async function getGeneratedDocument(
  tenantId: string,
  documentId: string
): Promise<GeneratedDocument | null> {
  const doc = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('generated_documents')
    .doc(documentId)
    .get();
  if (!doc.exists) return null;
  return mapDoc(doc.id, doc.data());
}

export async function getGeneratedDocumentByShareToken(
  token: string
): Promise<(GeneratedDocument & { tenantId: string }) | null> {
  const snap = await getDb()
    .collectionGroup('generated_documents')
    .where('shareToken', '==', token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = mapDoc(doc.id, doc.data());
  if (data.status === 'void') return null;
  if (data.shareExpiresAt && new Date(data.shareExpiresAt) < new Date()) return null;
  // Path: tenants/{tenantId}/generated_documents/{id}
  const parts = doc.ref.path.split('/');
  const tenantId = (data as any).tenantId || parts[1] || '';
  if (!tenantId) return null;
  return { ...data, tenantId };
}

export async function createShareLink(
  tenantId: string,
  documentId: string,
  expiresInDays = 30
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('generated_documents')
    .doc(documentId)
    .update({
      shareToken: token,
      shareExpiresAt: expiresAt,
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    });
  return { token, expiresAt };
}

export async function updateGeneratedDocumentStatus(
  tenantId: string,
  documentId: string,
  status: DocumentStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('generated_documents')
    .doc(documentId)
    .update({
      status,
      ...extra,
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    });
}

/** Envía el PDF por email (Resend/SendGrid vía createEmailService). */
export async function emailGeneratedDocument(
  tenantId: string,
  documentId: string,
  to: string,
  opts?: { subject?: string; message?: string }
): Promise<void> {
  const doc = await getGeneratedDocument(tenantId, documentId);
  if (!doc?.pdfUrl) throw new Error('Documento sin PDF');

  const { createEmailService } = await import('../messaging-outbound');
  const email = await createEmailService();
  if (!email) throw new Error('Email no configurado en la plataforma');

  const pdfRes = await fetch(doc.pdfUrl);
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());

  await email.service.sendEmail({
    tenantId,
    channel: 'email',
    direction: 'outbound',
    from: email.fromAddress,
    to,
    content:
      opts?.message ||
      `Adjunto encontrarás el documento ${doc.name} (${doc.documentNumber}).`,
    metadata: {
      subject: opts?.subject || `${doc.name} — ${doc.documentNumber}`,
    },
    emailAttachments: [
      {
        filename: `${doc.documentNumber}.pdf`,
        content: pdfBuf,
        contentType: 'application/pdf',
      },
    ],
  } as any);

  if (doc.status === 'final') {
    await updateGeneratedDocumentStatus(tenantId, documentId, 'sent');
  }
}

/**
 * Envía enlace (o mensaje con URL del PDF) por WhatsApp del tenant.
 * Meta Cloud API no adjunta PDF arbitrario de forma fiable; se envía el enlace de vista/descarga.
 */
export async function whatsappGeneratedDocument(
  tenantId: string,
  documentId: string,
  toPhone: string,
  opts?: { message?: string; publicBaseUrl?: string }
): Promise<{ url: string }> {
  const doc = await getGeneratedDocument(tenantId, documentId);
  if (!doc?.pdfUrl) throw new Error('Documento sin PDF');

  let shareUrl = doc.pdfUrl;
  if (!doc.shareToken || (doc.shareExpiresAt && new Date(doc.shareExpiresAt) < new Date())) {
    const { token } = await createShareLink(tenantId, documentId);
    const base =
      opts?.publicBaseUrl ||
      process.env.NEXT_PUBLIC_PUBLIC_WEB_URL ||
      process.env.PUBLIC_WEB_URL ||
      'https://autodealers-online.com';
    shareUrl = `${base.replace(/\/$/, '')}/documents/view/${token}`;
  } else {
    const base =
      opts?.publicBaseUrl ||
      process.env.NEXT_PUBLIC_PUBLIC_WEB_URL ||
      process.env.PUBLIC_WEB_URL ||
      'https://autodealers-online.com';
    shareUrl = `${base.replace(/\/$/, '')}/documents/view/${doc.shareToken}`;
  }

  const { sendOutboundWhatsApp } = await import('../messaging-outbound');
  const content =
    opts?.message ||
    `Documento ${doc.name} (${doc.documentNumber}):\n${shareUrl}`;
  const result = await sendOutboundWhatsApp(toPhone, content, tenantId);
  if (!result.success) {
    throw new Error(result.error || 'No se pudo enviar por WhatsApp');
  }

  if (doc.status === 'final') {
    await updateGeneratedDocumentStatus(tenantId, documentId, 'sent');
  }
  return { url: shareUrl };
}

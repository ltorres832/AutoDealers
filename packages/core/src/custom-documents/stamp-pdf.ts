/**
 * Sella un PDF plantilla con valores en posiciones normalizadas (0–1).
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { uploadFile } from '../storage';
import type { DocumentPayload, DocumentTemplate, GeneratedDocument, DocumentStatus } from './types';
import { resolveBinding } from './data-bind';

function getDb() {
  return getFirestore();
}

async function nextDocumentNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('counters')
    .doc('documents');
  const next = await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? Number(snap.data()?.seq || 0) : 0;
    const seq = current + 1;
    tx.set(counterRef, { seq, updatedAt: getFirestoreFieldValue().serverTimestamp() }, { merge: true });
    return seq;
  });
  return `DOC-${year}-${String(next).padStart(5, '0')}`;
}

async function fetchPdfBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error('No se pudo descargar la plantilla PDF');
  return new Uint8Array(await res.arrayBuffer());
}

export async function stampFillablePdf(
  tenantId: string,
  template: DocumentTemplate,
  payload: DocumentPayload,
  options: {
    userId: string;
    status?: DocumentStatus;
    vehicleId?: string;
    leadId?: string;
    saleId?: string;
  }
): Promise<GeneratedDocument> {
  if (!template.templateDocumentUrl) {
    throw new Error('La plantilla no tiene PDF base');
  }

  const status = options.status || 'final';
  const documentNumber = payload.documentNumber || (await nextDocumentNumber(tenantId));
  const bytes = await fetchPdfBytes(template.templateDocumentUrl);
  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const fieldValues = {
    ...(payload.fieldValues || {}),
    documentNumber,
  } as Record<string, string | number>;

  for (const field of template.fillableFields || []) {
    const pageIndex = field.position?.page ?? 0;
    const page = pages[pageIndex];
    if (!page || !field.position) continue;
    const { width, height } = page.getSize();
    const value =
      fieldValues[field.id] ??
      fieldValues[field.name] ??
      (field.binding ? resolveBinding(field.binding, payload) : '') ??
      field.defaultValue ??
      '';
    if (value === '' || value == null) continue;

    const x = field.position.x * width;
    const y = height - field.position.y * height - (field.position.height || 14);
    const text = String(value);
    page.drawText(text.slice(0, 120), {
      x,
      y: Math.max(8, y),
      size: Math.min(11, (field.position.height || 14) * 0.75),
      font,
      color: rgb(0.1, 0.1, 0.12),
      maxWidth: (field.position.width || 0.25) * width,
    });
  }

  if (status === 'draft') {
    const page = pages[0];
    if (page) {
      page.drawText('BORRADOR', {
        x: 180,
        y: page.getSize().height / 2,
        size: 42,
        font,
        color: rgb(0.85, 0.85, 0.88),
      });
    }
  }

  const pdfBuffer = Buffer.from(await pdfDoc.save());
  const docRef = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('generated_documents')
    .doc();
  const pdfUrl = await uploadFile(
    tenantId,
    pdfBuffer,
    `${docRef.id}.pdf`,
    'application/pdf',
    'documents'
  );

  const tenantSnap = await getDb().collection('tenants').doc(tenantId).get();
  const tenant = tenantSnap.data() || {};
  const ts = getFirestoreFieldValue().serverTimestamp();
  const record = {
    tenantId,
    templateId: template.id,
    engine: template.engine,
    type: template.type,
    name: template.name,
    status,
    documentNumber,
    payload: { ...payload, documentNumber, fieldValues },
    pdfUrl,
    parties: payload.parties || {
      dealerName: tenant.companyName || tenant.name,
    },
    vehicleId: options.vehicleId || null,
    leadId: options.leadId || null,
    saleId: options.saleId || null,
    createdBy: options.userId,
    createdAt: ts,
    updatedAt: ts,
  };
  await docRef.set(record);

  return {
    id: docRef.id,
    ...record,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as GeneratedDocument;
}

/** Overlay de texto sobre un PDF remoto (uso: contract-templates y similares). */
export async function stampPdfUrlWithFieldValues(
  pdfUrl: string,
  fields: Array<{
    id: string;
    name?: string;
    type?: string;
    defaultValue?: string;
    position?: { x: number; y: number; width?: number; height?: number; page?: number };
  }>,
  fieldValues: Record<string, unknown>
): Promise<Buffer> {
  const bytes = await fetchPdfBytes(pdfUrl);
  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const field of fields) {
    if (!field.position || field.type === 'signature') continue;
    const pageIndex = field.position.page ?? 0;
    const page = pages[pageIndex];
    if (!page) continue;
    const value = fieldValues[field.id] ?? (field.name ? fieldValues[field.name] : undefined) ?? field.defaultValue;
    if (value == null || value === '') continue;
    const { width, height } = page.getSize();
    const x = field.position.x * width;
    const y = height - field.position.y * height - (field.position.height || 14);
    page.drawText(String(value).slice(0, 120), {
      x,
      y: Math.max(8, y),
      size: Math.min(11, (field.position.height || 14) * 0.75),
      font,
      color: rgb(0.1, 0.1, 0.12),
      maxWidth: (field.position.width || 0.25) * width,
    });
  }

  return Buffer.from(await pdfDoc.save());
}

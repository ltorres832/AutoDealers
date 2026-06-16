/**
 * Genera PDF F&I, lo sube a Storage y registra metadata en la solicitud.
 */

import * as admin from 'firebase-admin';
import { getFirestore } from '@autodealers/shared';
import type { FIClient, FIRequest } from '@autodealers/crm';
import { uploadFile } from './storage';
import {
  generateFIDocumentPdf,
  fiTemplateFilename,
  type FIDocumentTemplate,
  TEMPLATE_TITLES,
} from './fi-pdf-documents';

export type { FIDocumentTemplate };

export interface StoredFIDocument {
  id: string;
  template: FIDocumentTemplate;
  title: string;
  filename: string;
  pdfUrl: string;
  pdfBuffer: Buffer;
  generatedAt: Date;
  generatedBy?: string;
}

export async function generateAndStoreFIDocument(options: {
  tenantId: string;
  userId?: string;
  requestId: string;
  template: FIDocumentTemplate;
  client: FIClient;
  request: FIRequest;
}): Promise<StoredFIDocument> {
  const db = getFirestore();
  const tenantSnap = await db.collection('tenants').doc(options.tenantId).get();
  const tenant = tenantSnap.data() as Record<string, unknown> | undefined;
  const settings = (tenant?.settings || {}) as Record<string, unknown>;

  const pdfBuffer = await generateFIDocumentPdf({
    tenantId: options.tenantId,
    userId: options.userId,
    template: options.template,
    client: options.client,
    request: options.request,
    tenantContact: {
      phone: (tenant?.contactPhone as string) || (settings.contactPhone as string),
      email: (tenant?.contactEmail as string) || (settings.contactEmail as string),
      address: (settings.address as string) || (tenant?.address as string),
    },
  });

  const filename = fiTemplateFilename(options.template, options.client.name);
  const pdfUrl = await uploadFile(
    options.tenantId,
    pdfBuffer,
    filename,
    'application/pdf',
    `fi-documents/${options.requestId}`
  );

  const docId = `${options.template}-${Date.now()}`;
  const record: StoredFIDocument = {
    id: docId,
    template: options.template,
    title: TEMPLATE_TITLES[options.template],
    filename,
    pdfUrl,
    pdfBuffer,
    generatedAt: new Date(),
    generatedBy: options.userId,
  };

  await db
    .collection('tenants')
    .doc(options.tenantId)
    .collection('fi_requests')
    .doc(options.requestId)
    .update({
      generatedDocuments: admin.firestore.FieldValue.arrayUnion({
        id: record.id,
        template: record.template,
        title: record.title,
        filename: record.filename,
        pdfUrl: record.pdfUrl,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        generatedBy: record.generatedBy,
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return record;
}

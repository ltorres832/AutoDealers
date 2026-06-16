// Generador de PDFs con Branding Configurable

import { ProfessionalPdfBuilder, formatDate } from './pdf-layout';
import { uploadFile } from './storage';

export interface PDFDocumentOptions {
  tenantId: string;
  userId?: string;
  documentType: 'certificate' | 'contract' | 'invoice' | 'receipt';
  content: {
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  };
  includeQR?: boolean;
  qrData?: string;
}

export interface PDFGenerationResult {
  pdfBuffer: Buffer;
  pdfUrl?: string;
}

export async function generatePDFWithBranding(
  options: PDFDocumentOptions
): Promise<PDFGenerationResult> {
  const { tenantId, userId, documentType, content } = options;

  const builder = await ProfessionalPdfBuilder.create({
    tenantId,
    userId,
    documentType,
  });

  builder.setHeader(content.title, formatDate());

  const paragraphs = content.body.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  for (const p of paragraphs) {
    builder.drawParagraph(p);
  }

  if (content.metadata && Object.keys(content.metadata).length > 0) {
    builder.drawSection('Información adicional');
    builder.drawFieldGrid(
      Object.entries(content.metadata).map(([label, value]) => ({
        label,
        value: value == null ? '—' : String(value),
      }))
    );
  }

  const pdfBuffer = await builder.finalize();
  return { pdfBuffer };
}

export async function generatePDFWithBrandingUrl(
  options: PDFDocumentOptions & { folder?: string; fileName?: string }
): Promise<PDFGenerationResult> {
  const { pdfBuffer } = await generatePDFWithBranding(options);
  const fileName = options.fileName || `${options.documentType}-${Date.now()}.pdf`;
  const pdfUrl = await uploadFile(
    options.tenantId,
    pdfBuffer,
    fileName,
    'application/pdf',
    options.folder || 'documents'
  );
  return { pdfBuffer, pdfUrl };
}

/** @deprecated Usar generateAndStoreFIDocument para documentos F&I */
export { generateAndStoreFIDocument, type FIDocumentTemplate } from './fi-pdf-service';

export async function generatePurchaseCertificate(
  tenantId: string,
  purchaseId: string,
  userId?: string
): Promise<PDFGenerationResult> {
  const { getFirestore } = await import('@autodealers/shared');
  const db = getFirestore();
  const purchaseDoc = await db.collection('purchase_intents').doc(purchaseId).get();
  if (!purchaseDoc.exists) {
    throw new Error('Purchase intent no encontrado');
  }
  const purchaseData = purchaseDoc.data();
  const vehicleDoc = await db.collection('vehicles').doc(purchaseData?.vehicle_id).get();
  const vehicleData = vehicleDoc.exists ? vehicleDoc.data() : null;
  const clientDoc = await db.collection('clients').doc(purchaseData?.client_id).get();
  const clientData = clientDoc.exists ? clientDoc.data() : null;

  return generatePDFWithBranding({
    tenantId,
    userId,
    documentType: 'certificate',
    content: {
      title: 'Certificado de Compra',
      body: [
        'Este certificado confirma la compra verificada del vehículo descrito a continuación.',
        '',
        `VIN: ${vehicleData?.vin || 'N/A'}`,
        `Marca: ${vehicleData?.make || 'N/A'}`,
        `Modelo: ${vehicleData?.model || 'N/A'}`,
        `Año: ${vehicleData?.year || 'N/A'}`,
        '',
        `Comprador: ${clientData?.name || 'N/A'}`,
        `Referencia: ${purchaseId}`,
      ].join('\n'),
      metadata: {
        'ID compra': purchaseId,
        Fecha: formatDate(),
      },
    },
  });
}

export async function generateContract(
  tenantId: string,
  contractId: string,
  userId?: string
): Promise<PDFGenerationResult> {
  const { getFirestore } = await import('@autodealers/shared');
  const db = getFirestore();
  const contractDoc = await db.collection('contracts').doc(contractId).get();
  if (!contractDoc.exists) {
    throw new Error('Contrato no encontrado');
  }
  const contractData = contractDoc.data();

  return generatePDFWithBranding({
    tenantId,
    userId,
    documentType: 'contract',
    content: {
      title: 'Contrato de Venta',
      body: String(contractData?.content || 'Contenido del contrato.'),
      metadata: {
        'ID contrato': contractId,
        Fecha: formatDate(),
      },
    },
  });
}

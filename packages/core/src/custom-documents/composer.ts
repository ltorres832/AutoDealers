/**
 * Compone un PDF nativo desde plantilla de bloques + payload.
 */
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { ProfessionalPdfBuilder, formatMoney, formatDate, sanitize } from '../pdf-layout';
import { uploadFile } from '../storage';
import type {
  DocumentPayload,
  DocumentTemplate,
  GeneratedDocument,
  DocumentStatus,
} from './types';
import { getDocumentTemplate } from './templates';
import { resolveBinding, str, money } from './data-bind';

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

export async function composeDocumentPdf(
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
  const status = options.status || 'final';
  const documentNumber = payload.documentNumber || (await nextDocumentNumber(tenantId));

  const db = getDb();
  const tenantSnap = await db.collection('tenants').doc(tenantId).get();
  const tenant = tenantSnap.data() || {};
  const branding = (tenant.branding || {}) as Record<string, unknown>;

  const builder = await ProfessionalPdfBuilder.create({
    tenantId,
    userId: options.userId,
    documentType: template.type === 'bill_of_sale' ? 'contract' : template.type,
    primaryColor: (branding.primaryColor as string) || undefined,
    tenantPhone: (tenant.phone as string) || undefined,
    tenantEmail: (tenant.email as string) || undefined,
    tenantAddress: (tenant.address as string) || undefined,
  });

  const title =
    payload.title ||
    template.layout?.sections?.find((s) => s.type === 'title')?.title ||
    template.name;
  builder.setHeader(title, `${documentNumber} · ${formatDate()}`);
  if (status === 'draft') builder.setDraftWatermark(true);

  const sections = (template.layout?.sections || []).filter((s) => s.enabled !== false);
  const buyer = (payload.buyer || {}) as Record<string, string>;
  const seller = (payload.seller || {}) as Record<string, string>;
  const vehicle = (payload.vehicle || {}) as Record<string, string | number>;
  const sale = (payload.sale || {}) as Record<string, string | number>;
  const payment = (payload.payment || {}) as Record<string, string | number>;

  for (const section of sections) {
    switch (section.type) {
      case 'header_branding':
        break;
      case 'title':
        builder.drawSection(section.title || title);
        if (payload.subtitle) builder.drawParagraph(String(payload.subtitle), { size: 10 });
        break;
      case 'party_info':
        builder.drawSection(section.title || 'Partes');
        builder.drawFieldGrid([
          {
            label: 'Comprador / Cliente',
            value: str(buyer.name || payload.parties?.buyerName),
          },
          {
            label: 'Email',
            value: str(buyer.email || payload.parties?.buyerEmail),
          },
          {
            label: 'Teléfono',
            value: str(buyer.phone || payload.parties?.buyerPhone),
          },
          {
            label: 'Dirección',
            value: str(buyer.address),
          },
          {
            label: 'Vendedor / Emisor',
            value: str(
              seller.name ||
                payload.parties?.sellerName ||
                payload.parties?.dealerName ||
                tenant.companyName ||
                tenant.name
            ),
          },
          {
            label: 'Email emisor',
            value: str(seller.email || tenant.email),
          },
        ]);
        break;
      case 'vehicle_info':
        builder.drawSection(section.title || 'Vehículo');
        builder.drawFieldGrid([
          { label: 'Año', value: str(vehicle.year) },
          { label: 'Marca', value: str(vehicle.make) },
          { label: 'Modelo', value: str(vehicle.model) },
          { label: 'VIN', value: str(vehicle.vin) },
          { label: 'Stock', value: str(vehicle.stockNumber) },
          { label: 'Odómetro', value: str(vehicle.mileage) },
          { label: 'Color', value: str(vehicle.color) },
          { label: 'Condición', value: str(vehicle.condition) },
        ]);
        break;
      case 'sale_terms':
        builder.drawSection(section.title || 'Términos de la venta');
        builder.drawFieldGrid([
          { label: 'Precio de venta', value: money(sale.price || vehicle.price) },
          { label: 'Depósito / Down payment', value: money(sale.downPayment) },
          { label: 'Método de pago', value: str(sale.paymentMethod || payment.method) },
          { label: 'Fecha de venta', value: str(sale.soldAt || formatDate()) },
        ]);
        break;
      case 'line_items': {
        builder.drawSection(section.title || 'Detalle');
        const items = payload.lineItems || [];
        if (items.length === 0 && vehicle.make) {
          items.push({
            description: `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim(),
            qty: 1,
            unitPrice: Number(sale.price || vehicle.price || 0),
            total: Number(sale.price || vehicle.price || 0),
          });
        }
        builder.drawTable(
          ['Descripción', 'Cant.', 'Precio', 'Total'],
          items.map((it) => [
            it.description,
            String(it.qty ?? 1),
            money(it.unitPrice),
            money(it.total ?? Number(it.qty || 1) * Number(it.unitPrice || 0)),
          ])
        );
        break;
      }
      case 'payment_summary': {
        builder.drawSection(section.title || 'Resumen de pago');
        const subtotal = Number(payment.subtotal ?? sale.price ?? vehicle.price ?? 0);
        const tax = Number(payment.tax ?? 0);
        const fees = Number(payment.fees ?? 0);
        const paid = Number(payment.amountPaid ?? sale.amountPaid ?? 0);
        const total = Number(payment.total ?? subtotal + tax + fees);
        builder.drawHighlightBox('Totales', [
          `Subtotal: ${money(subtotal)}`,
          `Impuestos: ${money(tax)}`,
          `Cargos: ${money(fees)}`,
          `Total: ${money(total)}`,
          `Pagado: ${money(paid)}`,
          `Balance: ${money(total - paid)}`,
        ]);
        break;
      }
      case 'legal_text':
        builder.drawSection(section.title || 'Términos legales');
        builder.drawParagraph(
          section.content ||
            (payload.legalTexts && section.title
              ? String(payload.legalTexts[section.title] || '')
              : '') ||
            ''
        );
        break;
      case 'checkbox_ack':
        builder.drawSection(section.title || 'Reconocimientos');
        for (const ack of section.acknowledgments || payload.acknowledgments || []) {
          builder.drawParagraph(`☐  ${ack}`, { size: 9.5 });
        }
        break;
      case 'signature_block':
        builder.drawSection(section.title || 'Firmas');
        for (const label of section.signatureLabels || ['Firma']) {
          builder.drawSignatureBlock(label);
        }
        break;
      case 'custom_fields': {
        builder.drawSection(section.title || 'Información adicional');
        const rows = (section.fields || []).map((f) => ({
          label: f.label,
          value: f.value || resolveBinding(f.binding, payload) || '—',
        }));
        if (payload.customFields?.length) {
          for (const cf of payload.customFields) {
            rows.push({ label: cf.label, value: cf.value });
          }
        }
        if (rows.length) builder.drawFieldGrid(rows);
        break;
      }
      case 'footer':
        if (section.content) builder.drawParagraph(section.content, { size: 8 });
        break;
      default:
        break;
    }
  }

  const pdfBuffer = await builder.finalize();
  const docRef = db.collection('tenants').doc(tenantId).collection('generated_documents').doc();
  const pdfUrl = await uploadFile(
    tenantId,
    pdfBuffer,
    `${docRef.id}.pdf`,
    'application/pdf',
    'documents'
  );

  const ts = getFirestoreFieldValue().serverTimestamp();
  const record = {
    tenantId,
    templateId: template.id,
    engine: template.engine,
    type: template.type,
    name: template.name,
    status,
    documentNumber,
    payload: { ...payload, documentNumber, title },
    pdfUrl,
    parties: payload.parties || {
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone,
      sellerName: seller.name,
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

export async function generateFromTemplateId(
  tenantId: string,
  templateId: string,
  payload: DocumentPayload,
  options: {
    userId: string;
    status?: DocumentStatus;
    vehicleId?: string;
    leadId?: string;
    saleId?: string;
  }
): Promise<GeneratedDocument> {
  const template = await getDocumentTemplate(tenantId, templateId);
  if (!template || !template.isActive) throw new Error('Plantilla no encontrada');
  if (template.aiDraft) throw new Error('Confirma el borrador de IA antes de generar documentos');

  if (template.engine === 'pdf_upload') {
    const { stampFillablePdf } = await import('./stamp-pdf');
    return stampFillablePdf(tenantId, template, payload, options);
  }
  return composeDocumentPdf(tenantId, template, payload, options);
}

/** Genera el primer template activo del tipo dado (p. ej. mark-as-sold → bill_of_sale). */
export async function generateByDocumentType(
  tenantId: string,
  type: string,
  payload: DocumentPayload,
  options: {
    userId: string;
    status?: DocumentStatus;
    vehicleId?: string;
    leadId?: string;
    saleId?: string;
  }
): Promise<GeneratedDocument> {
  const { listDocumentTemplates, seedDocumentTemplatesIfEmpty } = await import('./templates');
  await seedDocumentTemplatesIfEmpty(tenantId, options.userId);
  const templates = await listDocumentTemplates(tenantId);
  const match = templates.find((t) => t.type === type && t.isActive && !t.aiDraft);
  if (!match) throw new Error(`No hay plantilla activa de tipo ${type}`);
  return generateFromTemplateId(tenantId, match.id, payload, options);
}

export { sanitize, formatMoney, formatDate };

import { getAutomotiveBusinessById } from './automotive-business';
import {
  ensureBusinessDocumentLink,
  getBusinessEstimateById,
  getBusinessInvoiceById,
  markBusinessDocumentEmailed,
  type BusinessLineItem,
} from './automotive-ops';
import {
  checkoutPaymentMethodTypes,
  createOrReuseInvoicePaymentLink,
  documentLinkPublicUrl,
  describeCustomerPayMethods,
  getPaymentCapability,
  paymentLinkPublicUrl,
} from './automotive-payments';
import { sendConfiguredEmail } from './email-delivery';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(cents: number): string {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function itemsTable(items: BusinessLineItem[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.name || 'Concepto')}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:center;">${item.qty || 1}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${money(item.unitCents)}</td>
        </tr>`
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead><tr>
      <th style="text-align:left;padding:8px 0;">Concepto</th>
      <th style="text-align:center;padding:8px 0;">Cant.</th>
      <th style="text-align:right;padding:8px 0;">Precio</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function documentEmailShell(input: {
  title: string;
  intro: string;
  businessName: string;
  customerName: string;
  vehicleLabel?: string;
  notes?: string;
  items: BusinessLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  viewUrl: string;
  viewLabel: string;
  payUrl?: string;
  payMethodsLabel?: string;
  footer: string;
}): string {
  const payBlock = input.payUrl
    ? `<p style="margin:24px 0 8px;">
        <a href="${escapeHtml(input.payUrl)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
          Pagar factura
        </a>
      </p>
      <p style="color:#475569;font-size:13px;">${
        input.payMethodsLabel
          ? `En el enlace puedes pagar con ${escapeHtml(input.payMethodsLabel)}.`
          : 'Abre el enlace para ver los métodos de pago disponibles.'
      }</p>
      <p style="color:#475569;font-size:13px;">O copia este enlace: ${escapeHtml(input.payUrl)}</p>`
    : '';
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0f172a;">
    <h1 style="font-size:22px;margin:0 0 8px;">${escapeHtml(input.title)}</h1>
    <p style="color:#475569;margin:0 0 16px;">${escapeHtml(input.intro)}</p>
    <p><strong>Negocio:</strong> ${escapeHtml(input.businessName)}<br/>
    <strong>Cliente:</strong> ${escapeHtml(input.customerName)}
    ${input.vehicleLabel ? `<br/><strong>Vehículo:</strong> ${escapeHtml(input.vehicleLabel)}` : ''}</p>
    ${itemsTable(input.items)}
    <p style="margin:16px 0 0;">Subtotal: ${money(input.subtotalCents)}<br/>
    Impuesto: ${money(input.taxCents)}<br/>
    <strong>Total: ${money(input.totalCents)}</strong></p>
    ${input.notes ? `<p style="color:#475569;"><strong>Notas:</strong> ${escapeHtml(input.notes)}</p>` : ''}
    <p style="margin:24px 0 8px;">
      <a href="${escapeHtml(input.viewUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
        ${escapeHtml(input.viewLabel)}
      </a>
    </p>
    ${payBlock}
    <p style="color:#64748b;font-size:13px;margin-top:24px;">${escapeHtml(input.footer)}</p>
  </div>`;
}

export async function sendBusinessEstimateEmail(input: {
  tenantId: string;
  estimateId: string;
}): Promise<{ sent: boolean; to: string; viewUrl: string; error?: string }> {
  const [estimate, business] = await Promise.all([
    getBusinessEstimateById(input.tenantId, input.estimateId),
    getAutomotiveBusinessById(input.tenantId),
  ]);
  if (!estimate) throw new Error('Estimado no encontrado');
  const to = String(estimate.customerEmail || '').trim();
  if (!to || !to.includes('@')) {
    throw new Error('El estimado no tiene un email de cliente válido.');
  }
  const viewToken = await ensureBusinessDocumentLink({
    tenantId: input.tenantId,
    type: 'estimate',
    documentId: estimate.id,
    existingToken: estimate.viewToken,
  });
  const viewUrl = documentLinkPublicUrl(viewToken);
  const businessName = business?.name || 'Negocio';
  const result = await sendConfiguredEmail({
    to,
    subject: `Estimado de ${businessName} — no es un cobro`,
    html: documentEmailShell({
      title: 'Estimado de servicio',
      intro: `Hola ${estimate.customerName}, te enviamos un estimado. Este mensaje no es un cobro y no se realizará ningún cargo.`,
      businessName,
      customerName: estimate.customerName,
      vehicleLabel: estimate.vehicleLabel,
      notes: estimate.notes,
      items: estimate.items,
      subtotalCents: estimate.subtotalCents,
      taxCents: estimate.taxCents,
      totalCents: estimate.totalCents,
      viewUrl,
      viewLabel: 'Ver estimado',
      footer: 'Si tienes preguntas, responde a este correo o contacta al negocio directamente.',
    }),
  });
  if (!result.sent) {
    return { sent: false, to, viewUrl, error: result.error || 'No se pudo enviar el correo' };
  }
  await markBusinessDocumentEmailed(input.tenantId, 'estimate', estimate.id, { status: 'sent' });
  return { sent: true, to, viewUrl };
}

export async function sendBusinessInvoiceEmail(input: {
  tenantId: string;
  invoiceId: string;
}): Promise<{
  sent: boolean;
  to: string;
  viewUrl: string;
  payUrl?: string;
  payMethods?: string[];
  payMethodsLabel?: string;
  paymentsActive?: boolean;
  error?: string;
}> {
  const [invoice, business, capability] = await Promise.all([
    getBusinessInvoiceById(input.tenantId, input.invoiceId),
    getAutomotiveBusinessById(input.tenantId),
    getPaymentCapability(input.tenantId),
  ]);
  if (!invoice) throw new Error('Factura no encontrada');
  const to = String(invoice.customerEmail || '').trim();
  if (!to || !to.includes('@')) {
    throw new Error('La factura no tiene un email de cliente válido.');
  }
  const viewToken = await ensureBusinessDocumentLink({
    tenantId: input.tenantId,
    type: 'invoice',
    documentId: invoice.id,
    existingToken: invoice.viewToken,
  });
  const viewUrl = documentLinkPublicUrl(viewToken);
  let payUrl: string | undefined;
  if (capability.card && invoice.status !== 'paid' && invoice.status !== 'void' && invoice.totalCents > 0) {
    const link = await createOrReuseInvoicePaymentLink({
      tenantId: input.tenantId,
      invoiceId: invoice.id,
      amountCents: invoice.totalCents,
      description: `Factura de ${business?.name || 'servicio'} — ${invoice.customerName}`,
    });
    payUrl = paymentLinkPublicUrl(link.token);
    await markBusinessDocumentEmailed(input.tenantId, 'invoice', invoice.id, {
      status: 'sent',
      paymentLinkToken: link.token,
    });
  } else {
    await markBusinessDocumentEmailed(input.tenantId, 'invoice', invoice.id, {
      status: invoice.status === 'paid' ? 'paid' : 'sent',
    });
  }
  const businessName = business?.name || 'Negocio';
  const payMethodsLabel = describeCustomerPayMethods(capability);
  const result = await sendConfiguredEmail({
    to,
    subject: `Factura de ${businessName}`,
    html: documentEmailShell({
      title: 'Factura de servicio',
      intro: payUrl
        ? `Hola ${invoice.customerName}, te enviamos tu factura. Puedes pagarla en línea con ${payMethodsLabel || 'tarjeta'}.`
        : `Hola ${invoice.customerName}, te enviamos tu factura. Este negocio todavía no cobra por la plataforma; coordina el pago directamente.`,
      businessName,
      customerName: invoice.customerName,
      items: invoice.items,
      subtotalCents: invoice.subtotalCents,
      taxCents: invoice.taxCents,
      totalCents: invoice.totalCents,
      viewUrl,
      viewLabel: 'Ver factura',
      payUrl,
      payMethodsLabel,
      footer: payUrl
        ? `El enlace de pago cobra el total de esta factura. Métodos en la página: ${payMethodsLabel || 'tarjeta'}. Si ya pagaste, ignora este mensaje.`
        : 'Este correo es solo el documento de la factura. No incluye un botón de pago en línea.',
    }),
  });
  if (!result.sent) {
    return {
      sent: false,
      to,
      viewUrl,
      payUrl,
      payMethods: checkoutPaymentMethodTypes(capability),
      payMethodsLabel,
      paymentsActive: Boolean(capability.card),
      error: result.error || 'No se pudo enviar el correo',
    };
  }
  return {
    sent: true,
    to,
    viewUrl,
    payUrl,
    payMethods: checkoutPaymentMethodTypes(capability),
    payMethodsLabel,
    paymentsActive: Boolean(capability.card),
  };
}

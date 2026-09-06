import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import {
  createOrReuseInvoicePaymentLink,
  getPaymentCapability,
  listBusinessInvoices,
  paymentLinkPublicUrl,
  sendBusinessInvoiceEmail,
  upsertBusinessInvoice,
  describeCustomerPayMethods,
  checkoutPaymentMethodTypes,
  getPlatformPaymentMethodCatalog,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const [invoices, capability] = await Promise.all([
    listBusinessInvoices(auth.tenantId),
    getPaymentCapability(auth.tenantId),
  ]);
  const catalog = await getPlatformPaymentMethodCatalog(capability);
  return NextResponse.json({
    invoices,
    paymentsActive: Boolean(capability.card),
    payMethods: checkoutPaymentMethodTypes(capability),
    payMethodsLabel: describeCustomerPayMethods(capability),
    platformMethods: catalog.methods.filter((method) => method.flagEnabled),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === 'send_email' && body.id) {
    try {
      const result = await sendBusinessInvoiceEmail({ tenantId: auth.tenantId, invoiceId: String(body.id) });
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'No se pudo enviar la factura' }, { status: 400 });
    }
  }

  if (body.action === 'pay_link' && body.id) {
    try {
      const invoices = await listBusinessInvoices(auth.tenantId);
      const invoice = invoices.find((item) => item.id === body.id);
      if (!invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
      const link = await createOrReuseInvoicePaymentLink({
        tenantId: auth.tenantId,
        invoiceId: invoice.id,
        amountCents: invoice.totalCents,
        description: `Factura — ${invoice.customerName}`,
      });
      return NextResponse.json({ link, url: paymentLinkPublicUrl(link.token) });
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'No se pudo crear el enlace de pago' }, { status: 400 });
    }
  }

  const customerName = String(body.customerName || '').trim();
  if (!customerName) {
    return NextResponse.json({ error: 'El nombre del cliente es requerido' }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Agrega al menos un concepto' }, { status: 400 });
  }

  const invoice = await upsertBusinessInvoice(auth.tenantId, {
    id: body.id,
    estimateId: body.estimateId,
    customerName,
    customerEmail: body.customerEmail,
    customerPhone: body.customerPhone,
    items: body.items,
    taxCents: body.taxCents,
    paidCents: body.paidCents,
    status: body.status || 'draft',
  });
  return NextResponse.json({ invoice });
}

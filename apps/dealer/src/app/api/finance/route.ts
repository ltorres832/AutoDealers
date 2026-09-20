import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  listInvoices,
  createInvoice,
  recordPayment,
  listCashEntries,
  addCashEntry,
  getCustomerStatement,
  invoiceFromSale,
} from '@autodealers/crm';
import { getSaleById } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'invoices';

    if (view === 'caja') {
      const entries = await listCashEntries(auth.tenantId, { limit: 100 });
      return NextResponse.json({ entries });
    }
    if (view === 'statement') {
      const customer = searchParams.get('customer') || '';
      const statement = await getCustomerStatement(auth.tenantId, customer);
      return NextResponse.json({ statement });
    }

    const status = searchParams.get('status') || undefined;
    const invoices = await listInvoices(auth.tenantId, { status, limit: 100 });
    return NextResponse.json({ invoices });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const action = String(body.action || 'create_invoice');

    if (action === 'from_sale') {
      const sale = await getSaleById(auth.tenantId, String(body.saleId));
      if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
      const invoice = await invoiceFromSale(auth.tenantId, sale, auth.userId);
      return NextResponse.json({ invoice }, { status: 201 });
    }

    if (action === 'payment') {
      const result = await recordPayment({
        tenantId: auth.tenantId,
        invoiceId: String(body.invoiceId),
        amount: Number(body.amount),
        method: body.method || 'cash',
        reference: body.reference,
        notes: body.notes,
        createdBy: auth.userId,
      });
      return NextResponse.json(result, { status: 201 });
    }

    if (action === 'cash') {
      const entry = await addCashEntry({
        tenantId: auth.tenantId,
        type: body.type === 'out' ? 'out' : 'in',
        amount: Number(body.amount),
        category: String(body.category || 'manual'),
        description: body.description,
        createdBy: auth.userId,
      });
      return NextResponse.json({ entry }, { status: 201 });
    }

    if (action === 'void' || action === 'send') {
      const { updateInvoice } = await import('@autodealers/crm');
      const invoice = await updateInvoice(auth.tenantId, String(body.invoiceId), {
        status: action === 'void' ? 'void' : 'open',
      });
      return NextResponse.json({ invoice });
    }

    const invoice = await createInvoice({
      tenantId: auth.tenantId,
      source: body.source || 'manual',
      sourceId: body.sourceId,
      estimateId: body.estimateId,
      customerName: String(body.customerName || 'Cliente'),
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      leadId: body.leadId,
      description: body.description,
      items: body.items || [],
      subtotal: Number(body.subtotal ?? body.total ?? 0),
      tax: Number(body.tax || 0),
      total: Number(body.total || 0),
      currency: 'USD',
      createdBy: auth.userId,
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

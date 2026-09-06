import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import {
  convertBusinessEstimateToInvoice,
  listBusinessEstimates,
  sendBusinessEstimateEmail,
  upsertBusinessEstimate,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const estimates = await listBusinessEstimates(auth.tenantId);
  return NextResponse.json({ estimates });
}

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === 'send_email' && body.id) {
    try {
      const result = await sendBusinessEstimateEmail({ tenantId: auth.tenantId, estimateId: String(body.id) });
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'No se pudo enviar el estimado' }, { status: 400 });
    }
  }

  if (body.action === 'to_invoice' && body.id) {
    try {
      const invoice = await convertBusinessEstimateToInvoice(auth.tenantId, String(body.id));
      return NextResponse.json({ invoice });
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'No se pudo convertir' }, { status: 400 });
    }
  }

  const customerName = String(body.customerName || '').trim();
  if (!customerName) {
    return NextResponse.json({ error: 'El nombre del cliente es requerido' }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Agrega al menos un concepto' }, { status: 400 });
  }

  const estimate = await upsertBusinessEstimate(auth.tenantId, {
    id: body.id,
    customerName,
    customerEmail: body.customerEmail,
    customerPhone: body.customerPhone,
    vehicleLabel: body.vehicleLabel,
    notes: body.notes,
    items: body.items,
    taxCents: body.taxCents,
    status: body.status || 'draft',
  });
  return NextResponse.json({ estimate });
}

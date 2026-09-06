import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { updateLead, updateLeadStatus, type LeadStatus } from '@autodealers/crm';

const STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'appointment',
  'negotiation',
  'closed',
  'lost',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Falta el lead' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  if (body.status && STATUSES.includes(body.status)) {
    await updateLeadStatus(auth.tenantId, id, body.status);
  }

  const updates: Record<string, unknown> = {};
  if (body.notes !== undefined) updates.notes = String(body.notes || '');
  if (body.vehicleInterest !== undefined) updates.vehicleInterest = String(body.vehicleInterest || '');
  if (body.name || body.phone || body.email) {
    updates.contact = {
      name: String(body.name || '').trim(),
      phone: String(body.phone || '').trim(),
      email: String(body.email || '').trim() || undefined,
      preferredChannel: body.email ? 'email' : 'phone',
    };
  }
  if (Object.keys(updates).length) {
    await updateLead(auth.tenantId, id, updates as any);
  }

  return NextResponse.json({ ok: true });
}

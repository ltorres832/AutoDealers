import { NextRequest, NextResponse } from 'next/server';
import { authenticateV0Request, requireScope } from '@/lib/public-api-auth';
import { getLeads, createLead } from '@autodealers/crm';
import { dispatchTenantWebhook } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateV0Request(request);
  if (!auth.ok) return auth.response;
  const denied = requireScope(auth.scopes, 'leads:read');
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const limit = Math.min(200, Number(searchParams.get('limit') || 50));
  const leads = await getLeads(auth.tenantId, { status: status as any, limit });
  return NextResponse.json({
    data: leads.map((l) => ({
      id: l.id,
      status: l.status,
      source: l.source,
      contact: l.contact,
      assignedTo: l.assignedTo,
      createdAt: l.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateV0Request(request);
  if (!auth.ok) return auth.response;
  const denied = requireScope(auth.scopes, 'leads:write');
  if (denied) return denied;

  const body = await request.json();
  const name = String(body.contact?.name || body.name || '').trim();
  const phone = String(body.contact?.phone || body.phone || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'contact.name requerido' }, { status: 400 });
  }

  const lead = await createLead(
    auth.tenantId,
    body.source || 'manual',
    {
      name,
      phone: phone || '0000000000',
      email: body.contact?.email || body.email,
      preferredChannel: body.contact?.preferredChannel || 'phone',
      city: body.contact?.city,
    },
    body.notes || '',
    {
      createdBy: `api_key:${auth.keyId}`,
      vehicleInterest: body.vehicleInterest || null,
      budget: body.budget ?? null,
      assignedTo: body.assignedTo || null,
    }
  );

  await dispatchTenantWebhook(auth.tenantId, 'lead.created', {
    leadId: lead.id,
    source: lead.source,
  });

  return NextResponse.json({ data: lead }, { status: 201 });
}

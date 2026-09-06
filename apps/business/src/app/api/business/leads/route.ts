import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { createLead, getLeads } from '@autodealers/crm';

function mapLead(lead: any) {
  return {
    id: lead.id,
    name: lead.contact?.name || lead.name || '',
    phone: lead.contact?.phone || lead.phone || '',
    email: lead.contact?.email || lead.email || '',
    photo: lead.contact?.photo || lead.photo || '',
    status: lead.status || 'new',
    source: lead.source || 'manual',
    notes: lead.notes || '',
    vehicleInterest: lead.vehicleInterest || '',
    createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const leads = await getLeads(auth.tenantId);
  return NextResponse.json({ leads: leads.map(mapLead) });
}

export async function POST(request: NextRequest) {
  const auth = await requireBusiness(request);
  if (!auth?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const email = String(body.email || '').trim();
  if (!name || !phone) {
    return NextResponse.json({ error: 'Nombre y teléfono son requeridos' }, { status: 400 });
  }

  const lead = await createLead(
    auth.tenantId,
    'manual',
    {
      name,
      phone,
      email: email || undefined,
      preferredChannel: email ? 'email' : 'phone',
      city: body.city ? String(body.city) : undefined,
    },
    String(body.notes || ''),
    {
      assignedTo: auth.userId,
      createdBy: auth.userId,
      vehicleInterest: body.vehicleInterest ? String(body.vehicleInterest) : undefined,
    }
  );

  return NextResponse.json({ lead: mapLead(lead) });
}

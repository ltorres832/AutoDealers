import { NextRequest, NextResponse } from 'next/server';
import { getTenantById, canPerformAction, getFirestore } from '@autodealers/core';
import { createLead, normalizeLeadSource } from '@autodealers/crm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function sellerBelongsToTenant(tenantId: string, sellerId: string): Promise<boolean> {
  const db = getFirestore();
  const snap = await db.collection('users').doc(sellerId).get();
  if (!snap.exists) return false;
  const d = snap.data();
  if (d?.role !== 'seller' || d?.tenantId !== tenantId) return false;
  const status = d?.status;
  return status === undefined || status === 'active' || status === 'pending';
}

/**
 * Lead desde la página pública del tenant o del vendedor (modal de contacto, etc.).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      source,
      contact,
      notes,
      sellerId: sellerIdRaw,
      vehicleInterest,
      leadFormResponses: formResponsesRaw,
    } = body;

    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    if (!contact || typeof contact !== 'object') {
      return NextResponse.json({ error: 'contact requerido' }, { status: 400 });
    }

    const name = typeof contact.name === 'string' ? contact.name.trim() : '';
    const phone = typeof contact.phone === 'string' ? contact.phone.trim() : '';
    if (!name || !phone) {
      return NextResponse.json({ error: 'Nombre y teléfono son requeridos' }, { status: 400 });
    }

    const src = normalizeLeadSource(source, 'web');

    const tenant = await getTenantById(tenantId.trim());
    if (!tenant || (tenant as { status?: string }).status !== 'active') {
      return NextResponse.json({ error: 'Concesionario no encontrado' }, { status: 404 });
    }

    const quota = await canPerformAction(tenantId.trim(), 'addLead');
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason || 'No se pueden crear más leads este mes con el plan actual.' },
        { status: 403 }
      );
    }

    const email =
      typeof contact.email === 'string' && contact.email.trim() ? contact.email.trim() : undefined;
    const message =
      typeof contact.message === 'string' && contact.message.trim()
        ? contact.message.trim()
        : undefined;
    const noteText =
      typeof notes === 'string' && notes.trim()
        ? notes.trim()
        : message || undefined;

    const preferredChannel =
      typeof contact.preferredChannel === 'string' && contact.preferredChannel.trim()
        ? contact.preferredChannel.trim()
        : email
          ? 'email'
          : 'phone';

    let assignedTo: string | undefined;
    const sellerId =
      typeof sellerIdRaw === 'string' && sellerIdRaw.trim() ? sellerIdRaw.trim() : '';
    if (sellerId) {
      const ok = await sellerBelongsToTenant(tenantId.trim(), sellerId);
      if (!ok) {
        return NextResponse.json({ error: 'Vendedor no válido para este concesionario' }, { status: 400 });
      }
      assignedTo = sellerId;
    }

    const leadFormResponses: Record<string, string> = {};
    if (formResponsesRaw && typeof formResponsesRaw === 'object' && !Array.isArray(formResponsesRaw)) {
      for (const [k, v] of Object.entries(formResponsesRaw as Record<string, unknown>)) {
        if (typeof v === 'string' && v.trim()) leadFormResponses[k] = v.trim();
      }
    }
    if (message) leadFormResponses.Mensaje = message;
    if (email) leadFormResponses.Email = email;
    leadFormResponses.Nombre = name;
    leadFormResponses.Teléfono = phone;

    const vehicleInterestStr =
      typeof vehicleInterest === 'string' && vehicleInterest.trim()
        ? vehicleInterest.trim()
        : undefined;

    const lead = await createLead(
      tenantId.trim(),
      src,
      {
        name,
        phone,
        email,
        preferredChannel,
      },
      noteText,
      {
        ...(assignedTo ? { assignedTo } : {}),
        ...(vehicleInterestStr ? { vehicleInterest: vehicleInterestStr } : {}),
        ...(Object.keys(leadFormResponses).length > 0 ? { leadFormResponses } : {}),
        populateStandardContactFields: true,
        tags: sellerId ? ['pagina_vendedor', 'formulario_contacto'] : ['formulario_contacto'],
      }
    );

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al crear el lead';
    console.error('POST /api/leads/public', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

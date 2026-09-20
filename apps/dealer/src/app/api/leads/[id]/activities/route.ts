import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole, isSellerRole } from '@/lib/auth';
import { addInteraction, getLeadById, updateLead } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const lead = await getLeadById(auth.tenantId, id);
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    if (isSellerRole(auth.role) && lead.assignedTo !== auth.userId && !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const type = String(body.type || 'note');
    const content = String(body.content || '').trim();
    if (!content) return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 });
    if (!['note', 'call', 'email', 'message', 'appointment'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    await addInteraction(auth.tenantId, id, {
      type: type as 'note' | 'call' | 'email' | 'message' | 'appointment',
      content,
      userId: auth.userId,
    });
    await updateLead(auth.tenantId, id, { lastContactDate: new Date() });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

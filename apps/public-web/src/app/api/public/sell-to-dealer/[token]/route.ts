import { NextRequest, NextResponse } from 'next/server';
import {
  getSellToDealerByToken,
  listSellToDealerMessages,
  addSellToDealerMessage,
  respondSellToDealerOffer,
} from '@autodealers/crm';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const req = await getSellToDealerByToken(token);
    if (!req) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }
    const messages = await listSellToDealerMessages(req.tenantId, req.id);
    return NextResponse.json({
      request: {
        id: req.id,
        tenantId: req.tenantId,
        subdomain: req.subdomain,
        status: req.status,
        contact: req.contact,
        vehicle: req.vehicle,
        offer: req.offer,
        appointmentId: req.appointmentId || null,
        publicToken: req.publicToken,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      },
      messages: messages.map((m) => ({
        id: m.id,
        fromClient: m.fromClient,
        fromUserName: m.fromUserName || null,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error('GET sell-to-dealer token:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const body = await request.json();
    const action = String(body.action || 'message');

    const req = await getSellToDealerByToken(token);
    if (!req) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    if (action === 'message') {
      const content = String(body.content || '').trim();
      if (!content) {
        return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
      }
      const msg = await addSellToDealerMessage(req.tenantId, req.id, {
        fromClient: true,
        content,
      });
      return NextResponse.json({
        ok: true,
        message: {
          id: msg.id,
          fromClient: true,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
        },
      });
    }

    if (action === 'accept_offer' || action === 'reject_offer') {
      const updated = await respondSellToDealerOffer(
        token,
        action === 'accept_offer' ? 'accepted' : 'rejected'
      );

      let pathSub = updated.subdomain || '';
      if (!pathSub && action === 'accept_offer') {
        try {
          const { getFirestore } = await import('@autodealers/core');
          const tSnap = await getFirestore().collection('tenants').doc(updated.tenantId).get();
          const sub = tSnap.data()?.subdomain;
          if (typeof sub === 'string' && sub.trim()) pathSub = sub.trim();
          else pathSub = updated.tenantId;
        } catch {
          pathSub = updated.tenantId;
        }
      }

      const appointmentHref =
        updated.status === 'offer_accepted'
          ? `/${pathSub}/appointment?sellToDealerToken=${encodeURIComponent(token)}&name=${encodeURIComponent(updated.contact.name)}&phone=${encodeURIComponent(updated.contact.phone)}&email=${encodeURIComponent(updated.contact.email)}&type=consultation&notes=${encodeURIComponent(`Cierre de compra de auto del cliente: ${updated.vehicle.year} ${updated.vehicle.make} ${updated.vehicle.model}`)}`
          : null;

      return NextResponse.json({
        ok: true,
        status: updated.status,
        offer: updated.offer,
        appointmentHref,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (e) {
    console.error('POST sell-to-dealer token:', e);
    const message = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

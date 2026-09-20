import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import {
  createSupplier,
  listSuppliers,
  updateSupplier,
  createPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  getPurchaseOrder,
  purchaseOrderPlainText,
  purchaseOrderEmailHtml,
} from '@autodealers/inventory';
import { dispatchTenantWebhook, getEmailCredentials, getFirestore } from '@autodealers/core';
import { EmailService } from '@autodealers/messaging';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'suppliers';
    const status = url.searchParams.get('status') || undefined;
    const orderId = url.searchParams.get('id');
    const format = url.searchParams.get('format');

    if (view === 'order' && orderId) {
      const order = await getPurchaseOrder(auth.tenantId, orderId);
      if (!order) return NextResponse.json({ error: 'PO no encontrada' }, { status: 404 });

      if (format === 'text') {
        return new NextResponse(purchaseOrderPlainText(order), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      if (format === 'html' || format === 'print') {
        const tenantDoc = await getFirestore().collection('tenants').doc(auth.tenantId).get();
        const dealerName =
          (tenantDoc.data()?.companyName as string) ||
          (tenantDoc.data()?.name as string) ||
          'Concesionario';
        const html = purchaseOrderEmailHtml(order, dealerName).replace(
          '</body>',
          `<script>window.onload=function(){window.print();}</script></body>`
        );
        return new NextResponse(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      return NextResponse.json({ order });
    }

    if (view === 'orders') {
      const orders = await listPurchaseOrders(auth.tenantId, {
        status: status as any,
        limit: 100,
      });
      return NextResponse.json({ orders });
    }

    const suppliers = await listSuppliers(auth.tenantId);
    return NextResponse.json({ suppliers });
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
    const action = String(body.action || 'create_supplier');

    if (action === 'create_supplier') {
      const supplier = await createSupplier({
        tenantId: auth.tenantId,
        name: body.name,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        accountNumber: body.accountNumber,
        notes: body.notes,
      });
      return NextResponse.json({ supplier }, { status: 201 });
    }

    if (action === 'update_supplier') {
      await updateSupplier(auth.tenantId, String(body.id), {
        name: body.name,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        accountNumber: body.accountNumber,
        notes: body.notes,
        active: body.active,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'create_po') {
      const order = await createPurchaseOrder({
        tenantId: auth.tenantId,
        supplierId: String(body.supplierId),
        lines: Array.isArray(body.lines) ? body.lines : [],
        tax: Number(body.tax || 0),
        notes: body.notes,
        createdBy: auth.userId,
        status: body.status || 'ordered',
      });
      return NextResponse.json({ order }, { status: 201 });
    }

    if (action === 'send_po') {
      const order = await getPurchaseOrder(auth.tenantId, String(body.id));
      if (!order) return NextResponse.json({ error: 'PO no encontrada' }, { status: 404 });

      const supplierSnap = await getFirestore()
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('parts_suppliers')
        .doc(order.supplierId)
        .get();
      const supplierEmail =
        String(body.to || '').trim() || String(supplierSnap.data()?.email || '').trim();
      if (!supplierEmail) {
        return NextResponse.json(
          { error: 'El suplidor no tiene email. Agrégalo en Suplidores o indica un destinatario.' },
          { status: 400 }
        );
      }

      const emailCreds = await getEmailCredentials();
      if (!emailCreds?.apiKey) {
        return NextResponse.json({ error: 'Servicio de email no configurado' }, { status: 500 });
      }

      const tenantDoc = await getFirestore().collection('tenants').doc(auth.tenantId).get();
      const dealerName =
        (tenantDoc.data()?.companyName as string) ||
        (tenantDoc.data()?.name as string) ||
        'Concesionario';

      const emailProvider =
        emailCreds.apiKey.includes('re_') || emailCreds.apiKey.startsWith('re_')
          ? 'resend'
          : 'sendgrid';
      const emailService = new EmailService(emailCreds.apiKey, emailProvider);
      const html = purchaseOrderEmailHtml(order, dealerName);
      const plain = purchaseOrderPlainText(order);

      const sendResult = await emailService.sendEmail({
        tenantId: auth.tenantId,
        channel: 'email',
        direction: 'outbound',
        from: emailCreds.fromAddress || 'noreply@autodealers-online.com',
        to: supplierEmail,
        content: html,
        metadata: {
          subject: body.subject || `Orden de compra ${order.number} — ${dealerName}`,
          type: 'purchase_order',
          purchaseOrderId: order.id,
          number: order.number,
          text: plain,
        },
      });

      if (sendResult.status === 'failed') {
        return NextResponse.json(
          { error: sendResult.error || 'No se pudo enviar el email' },
          { status: 502 }
        );
      }

      const updated =
        order.status === 'draft'
          ? await updatePurchaseOrderStatus(auth.tenantId, order.id, 'ordered')
          : order;

      try {
        await getFirestore()
          .collection('tenants')
          .doc(auth.tenantId)
          .collection('purchase_orders')
          .doc(order.id)
          .set(
            {
              sentAt: new Date(),
              sentTo: supplierEmail,
              updatedAt: new Date(),
            },
            { merge: true }
          );
      } catch {
        /* ignore */
      }

      try {
        await dispatchTenantWebhook(auth.tenantId, 'po.sent', {
          purchaseOrderId: order.id,
          number: order.number,
          to: supplierEmail,
        });
      } catch {
        /* ignore */
      }

      return NextResponse.json({ ok: true, order: updated, sentTo: supplierEmail });
    }

    if (action === 'po_status') {
      const order = await updatePurchaseOrderStatus(
        auth.tenantId,
        String(body.id),
        body.status
      );
      return NextResponse.json({ order });
    }

    if (action === 'receive_po') {
      const order = await receivePurchaseOrder(
        auth.tenantId,
        String(body.id),
        Array.isArray(body.receipts) ? body.receipts : []
      );
      try {
        await dispatchTenantWebhook(auth.tenantId, 'po.received', {
          purchaseOrderId: order.id,
          number: order.number,
          status: order.status,
        });
      } catch {
        /* ignore */
      }
      return NextResponse.json({ order });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

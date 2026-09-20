export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  createSalesEmployeeAdOrder,
  getSalesAdCatalog,
  listSalesEmployeeAccounts,
  listSalesEmployeeAdOrders,
  regenerateSalesAdCheckoutUrl,
} from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function GET(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(request.url);
  const accountId = String(url.searchParams.get('accountId') || '').trim();
  const accounts = await listSalesEmployeeAccounts(auth.salesEmployeeId);
  const account = accountId ? accounts.find((item) => item.id === accountId) : accounts[0];
  const role = (account?.role || 'dealer') as 'dealer' | 'seller' | 'business';
  const [catalog, orders] = await Promise.all([
    getSalesAdCatalog(role),
    listSalesEmployeeAdOrders(auth.salesEmployeeId),
  ]);

  return NextResponse.json({
    catalog,
    orders,
    accounts: accounts.map((item) => ({
      id: item.id,
      role: item.role,
      name: item.name,
      companyName: item.companyName,
      email: item.email,
      tenantId: item.tenantId,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();

    // Regenerar link de pago de una orden existente (no borra inventario).
    if (body?.action === 'regenerate_checkout' && body.orderId) {
      const result = await regenerateSalesAdCheckoutUrl({
        employeeId: auth.salesEmployeeId,
        orderId: String(body.orderId).trim(),
      });
      return NextResponse.json({ success: true, ...result });
    }

    const result = await createSalesEmployeeAdOrder({
      employeeId: auth.salesEmployeeId,
      accountId: String(body.accountId || '').trim(),
      productKind: body.productKind,
      payMode: body.payMode,
      title: body.title,
      description: body.description,
      imageUrl: body.imageUrl,
      ctaText: body.ctaText,
      linkType: body.linkType,
      linkValue: body.linkValue,
      duration: body.duration != null ? Number(body.duration) : undefined,
      promotionScope: body.promotionScope,
      vehicleId: body.vehicleId,
      featuredPlanId: body.featuredPlanId,
      name: body.name,
    });

    if (result.checkoutError && !result.checkoutUrl) {
      return NextResponse.json(
        {
          success: true,
          ...result,
          warning: `Anuncio asignado, pero no se pudo crear el link de pago: ${result.checkoutError}`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el anuncio';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  provisionSalesEmployeeClient,
  listSalesMembershipsForRole,
  listBusinessCategories,
} from '@autodealers/core';
import { verifySalesEmployeeAuth } from '@/lib/sales-employee-auth';

export async function GET(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const type = String(request.nextUrl.searchParams.get('type') || 'dealer');
  if (type !== 'dealer' && type !== 'seller' && type !== 'business') {
    return NextResponse.json({ error: 'Tipo de cuenta inválido', memberships: [], categories: [] }, { status: 400 });
  }

  try {
    const [memberships, categories] = await Promise.all([
      listSalesMembershipsForRole(type),
      type === 'business' ? listBusinessCategories(true) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      memberships: memberships.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        currency: item.currency,
        billingCycle: item.billingCycle,
      })),
      categories: categories.map((item) => ({ slug: item.slug, name: item.name })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los planes';
    return NextResponse.json({ error: message, memberships: [], categories: [] }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySalesEmployeeAuth(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const role = String(body.role || '') as 'dealer' | 'seller' | 'business';
    if (!['dealer', 'seller', 'business'].includes(role)) {
      return NextResponse.json({ error: 'Tipo de cuenta inválido' }, { status: 400 });
    }

    const result = await provisionSalesEmployeeClient({
      employeeId: auth.salesEmployeeId,
      role,
      name: String(body.name || ''),
      email: String(body.email || ''),
      phone: String(body.phone || ''),
      companyName: String(body.companyName || ''),
      categorySlug: String(body.categorySlug || ''),
      visitNotes: String(body.visitNotes || ''),
      visitedAt: String(body.visitedAt || ''),
      prospectRelation: body.prospectRelation || 'unknown',
    });

    return NextResponse.json({
      success: true,
      ...result,
      message:
        'Cuenta creada. Entrega al cliente su email y la clave temporal; deberá cambiarla al iniciar.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la cuenta';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

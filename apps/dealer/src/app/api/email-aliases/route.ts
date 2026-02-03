// API Route: Gestión de Aliases (Dealer)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getEmailAliases, createEmailAlias, getEmailAliasUsage } from '@autodealers/crm';
import { getTenantById } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'dealer' || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener dealerId desde tenant
    // Nota: En el sistema actual, el tenantId puede ser el dealerId
    // Si necesitas una lógica diferente, ajusta aquí
    const dealerId = user.tenantId;

    const aliases = await getEmailAliases(dealerId);
    const usage = await getEmailAliasUsage(dealerId);

    return NextResponse.json({ aliases, usage });
  } catch (error) {
    console.error('Error getting email aliases:', error);
    return NextResponse.json(
      { error: 'Error al obtener aliases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'dealer' || !user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { alias, assignedTo } = body;

    if (!alias || !assignedTo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: alias, assignedTo' },
        { status: 400 }
      );
    }

    const dealerId = user.tenantId;
    const emailAlias = await createEmailAlias(dealerId, alias, assignedTo);

    return NextResponse.json({ alias: emailAlias });
  } catch (error) {
    console.error('Error creating email alias:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear alias' },
      { status: 500 }
    );
  }
}




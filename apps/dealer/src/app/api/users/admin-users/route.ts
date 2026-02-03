export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createDealerAdminUser, getDealerAdminUsers } from '@autodealers/core';
import { getTenantById } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener el dealerId del tenant
    const tenant = await getTenantById(auth.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const users = await getDealerAdminUsers(auth.tenantId);
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching dealer admin users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, name, tenantIds, permissions } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password y name son requeridos' },
        { status: 400 }
      );
    }

    if (!tenantIds || tenantIds.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un dealer' },
        { status: 400 }
      );
    }

    // Obtener el dealerId del tenant
    const tenant = await getTenantById(auth.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const user = await createDealerAdminUser(
      email,
      password,
      name,
      tenantIds, // Array de tenant IDs que puede administrar
      auth.tenantId, // dealerId del dealer que lo crea
      permissions || {},
      auth.userId || ''
    );

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating dealer admin user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


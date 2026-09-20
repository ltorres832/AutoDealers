import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createAdvertiser, resolvePlatformAdminName } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      companyName,
      contactName,
      phone = '',
      website = '',
      industry = 'other',
      plan = 'starter',
      assignedAdminId = '',
    } = body;

    if (!email || !companyName || !contactName) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const createdByName =
      (await resolvePlatformAdminName(auth.userId)) || auth.email || 'Admin';

    let assignedAdminName: string | undefined;
    const normalizedAssignee = String(assignedAdminId || '').trim();
    if (normalizedAssignee) {
      assignedAdminName = await resolvePlatformAdminName(normalizedAssignee);
      if (!assignedAdminName) {
        return NextResponse.json({ error: 'Administrador asignado no encontrado' }, { status: 404 });
      }
    }

    const advertiser = await createAdvertiser(
      {
        email,
        companyName,
        contactName,
        phone,
        website,
        industry,
        status: 'active',
        plan,
      } as Parameters<typeof createAdvertiser>[0],
      {
        registrationSource: 'admin',
        createdBy: auth.userId,
        createdByName,
        assignedAdminId: normalizedAssignee || undefined,
        assignedAdminName,
        assignedBy: auth.userId,
      }
    );

    return NextResponse.json({ success: true, advertiser });
  } catch (error: unknown) {
    console.error('Error creating advertiser:', error);
    const message = error instanceof Error ? error.message : 'Error al crear anunciante';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

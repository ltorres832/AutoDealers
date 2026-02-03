// API Route: Cambiar membresía de dealer (Admin)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { adjustAliasesOnMembershipChange } from '@autodealers/crm';
import { getTenantById } from '@autodealers/core';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { dealerId } = await params;
    const body = await request.json();
    const { newMembershipId } = body;

    if (!newMembershipId) {
      return NextResponse.json({ error: 'Falta newMembershipId' }, { status: 400 });
    }

    // Ajustar aliases automáticamente
    const result = await adjustAliasesOnMembershipChange(dealerId, newMembershipId);

    return NextResponse.json({
      success: true,
      message: 'Membresía actualizada y aliases ajustados',
      suspended: result.suspended,
      allowed: result.allowed,
    });
  } catch (error) {
    console.error('Error changing membership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al cambiar membresía' },
      { status: 500 }
    );
  }
}




// API route para gestionar solicitudes F&I (Admin)
// GET: Obtener todas las solicitudes de todos los tenants

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFIRequests } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden acceder' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;
    const status = searchParams.get('status') as any;

    // Si se especifica un tenantId, obtener solo de ese tenant
    if (tenantId) {
      const requests = await getFIRequests(tenantId, { status });
      return NextResponse.json({ requests });
    }

    // Si no, obtener de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    const allRequests: any[] = [];

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantRequests = await getFIRequests(tenantDoc.id, { status });
      allRequests.push(...tenantRequests);
    }

    return NextResponse.json({ requests: allRequests });
  } catch (error: any) {
    console.error('Error en GET /api/fi/requests:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener solicitudes F&I' },
      { status: 500 }
    );
  }
}


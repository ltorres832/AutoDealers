import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTenantById, updateTenant } from '@autodealers/core';
import { getUsersByTenant } from '@autodealers/core';
import { getVehicles } from '@autodealers/inventory';
import { getLeads } from '@autodealers/crm';
import { getTenantSales } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      console.error('Unauthorized access attempt to tenant:', id);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id || id === 'undefined' || id === 'null') {
      console.error('Invalid tenant ID:', id);
      return NextResponse.json({ error: 'Invalid tenant ID' }, { status: 400 });
    }

    const tenant = await getTenantById(id);
    if (!tenant) {
      console.warn('Tenant not found:', id);
      return NextResponse.json({ error: 'Tenant not found', tenantId: id }, { status: 404 });
    }

    // Obtener datos adicionales del tenant desde Firestore
    const tenantDoc = await db.collection('tenants').doc(id).get();
    const tenantData = tenantDoc.data();

    // Obtener datos relacionados
    const [users, vehicles, leads, sales] = await Promise.all([
      getUsersByTenant(id),
      getVehicles(id),
      getLeads(id),
      getTenantSales(id),
    ]);

    return NextResponse.json({
      tenant: {
        ...tenant,
        description: tenantData?.description || '',
        users,
        vehicles,
        leads,
        sales,
      },
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;
    await updateTenant(id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


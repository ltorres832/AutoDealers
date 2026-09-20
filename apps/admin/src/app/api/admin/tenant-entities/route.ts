export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { adminDeleteTenantSubcollectionDoc } from '@autodealers/core/admin-platform-delete';
import { deleteLead, deleteReview } from '@autodealers/crm';
import { deleteVehicle } from '@autodealers/inventory/vehicles';

const ALLOWED_COLLECTIONS = new Set([
  'campaigns',
  'promotions',
  'banners',
  'workflows',
  'tasks',
  'leads',
  'reviews',
  'vehicles',
  'sales',
  'segments',
  'tags',
  'scoring_rules',
  'customer_files',
  'fi_requests',
  'public_chat_sessions',
]);

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const tenantId = String(body.tenantId || searchParams.get('tenantId') || '').trim();
    const collection = String(body.collection || searchParams.get('collection') || '').trim();
    const entityId = String(
      body.entityId || body.id || searchParams.get('entityId') || searchParams.get('id') || ''
    ).trim();

    if (!tenantId || !collection || !entityId) {
      return NextResponse.json(
        { error: 'tenantId, collection y entityId son obligatorios' },
        { status: 400 }
      );
    }

    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return NextResponse.json({ error: 'Colección no permitida para eliminación' }, { status: 400 });
    }

    if (collection === 'leads') {
      await deleteLead(tenantId, entityId);
    } else if (collection === 'reviews') {
      await deleteReview(tenantId, entityId);
    } else if (collection === 'vehicles') {
      await deleteVehicle(tenantId, entityId);
    } else {
      await adminDeleteTenantSubcollectionDoc(tenantId, collection, entityId);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al eliminar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

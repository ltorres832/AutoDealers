import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, getTenantBySubdomain } from '@autodealers/core';

export const dynamic = 'force-dynamic';

function isActiveUser(data: Record<string, unknown>): boolean {
  const status = String(data.status || 'active').trim();
  return status !== 'suspended' && status !== 'cancelled' && status !== 'inactive';
}

async function resolveActiveTenant(identifier: string): Promise<{ id: string; status?: string; sellerInfo?: Record<string, unknown> } | null> {
  const value = identifier.trim();
  if (!value) return null;
  const bySubdomain = await getTenantBySubdomain(value);
  if (bySubdomain?.status === 'active') {
    return bySubdomain as unknown as { id: string; status?: string; sellerInfo?: Record<string, unknown> };
  }
  const doc = await getFirestore().collection('tenants').doc(value).get();
  if (!doc.exists) return null;
  const data = doc.data() || {};
  if (data.status !== 'active') return null;
  return { id: doc.id, status: data.status, sellerInfo: data.sellerInfo };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    const tenant = await resolveActiveTenant(subdomain);
    if (!tenant) {
      return NextResponse.json({ sellers: [] }, { status: 404 });
    }

    const db = getFirestore();
    const tenantId = tenant.id;
    const sellers = new Map<string, Record<string, unknown>>();

    const tenantUsersSnap = await db
      .collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', '==', 'seller')
      .limit(50)
      .get();
    tenantUsersSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (!isActiveUser(data)) return;
      sellers.set(doc.id, {
        id: doc.id,
        name: data.name || data.displayName || 'Vendedor',
        email: data.email || '',
        photo: data.photo || data.profilePhoto || data.photoUrl || '',
        phone: data.phone || data.whatsapp || '',
        bio: data.bio || '',
      });
    });

    const dealerUsersSnap = await db
      .collection('users')
      .where('dealerId', '==', tenantId)
      .where('role', '==', 'seller')
      .limit(50)
      .get();
    dealerUsersSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (!isActiveUser(data)) return;
      sellers.set(doc.id, {
        id: doc.id,
        name: data.name || data.displayName || 'Vendedor',
        email: data.email || '',
        photo: data.photo || data.profilePhoto || data.photoUrl || '',
        phone: data.phone || data.whatsapp || '',
        bio: data.bio || '',
      });
    });

    const sellerInfo = (tenant as unknown as { sellerInfo?: Record<string, unknown> }).sellerInfo;
    const sellerInfoId = typeof sellerInfo?.id === 'string' ? sellerInfo.id.trim() : '';
    if (sellerInfoId && !sellers.has(sellerInfoId)) {
      const userSnap = await db.collection('users').doc(sellerInfoId).get();
      const data = userSnap.data() || {};
      if (userSnap.exists && data.role === 'seller' && isActiveUser(data)) {
        sellers.set(userSnap.id, {
          id: userSnap.id,
          name: data.name || sellerInfo?.name || 'Vendedor',
          email: data.email || '',
          photo: data.photo || data.profilePhoto || data.photoUrl || sellerInfo?.photo || '',
          phone: data.phone || data.whatsapp || '',
          bio: data.bio || sellerInfo?.bio || '',
        });
      }
    }

    return NextResponse.json({ sellers: Array.from(sellers.values()) });
  } catch (error) {
    console.error('GET /api/sellers/[subdomain]', error);
    return NextResponse.json({ sellers: [], error: 'Internal server error' }, { status: 500 });
  }
}

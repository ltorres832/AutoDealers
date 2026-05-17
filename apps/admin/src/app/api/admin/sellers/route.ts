import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAllSellersForAdmin } from '@autodealers/core';
import { getAuth } from '@autodealers/shared';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId')?.trim() || undefined;
    const status = searchParams.get('status')?.trim() || undefined;
    const search = searchParams.get('search')?.trim() || undefined;
    const linkType = searchParams.get('linkType') as 'all' | 'independent' | 'linked' | null;

    const sellers = await getAllSellersForAdmin({
      dealerId,
      status,
      search,
      linkType: linkType && linkType !== 'all' ? linkType : undefined,
    });

    const authAdmin = getAuth();
    const withAuth = await Promise.all(
      sellers.map(async (s) => {
        let authDisabled: boolean | undefined;
        try {
          const rec = await authAdmin.getUser(s.id);
          authDisabled = !!rec.disabled;
        } catch {
          authDisabled = undefined;
        }
        return {
          ...s,
          createdAt:
            s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
          updatedAt:
            s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
          lastLogin:
            s.lastLogin instanceof Date ? s.lastLogin.toISOString() : s.lastLogin,
          authDisabled,
        };
      })
    );

    return NextResponse.json({ sellers: withAuth, count: withAuth.length });
  } catch (e) {
    console.error('[admin/sellers GET]', e);
    const message = e instanceof Error ? e.message : 'Error al cargar vendedores';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

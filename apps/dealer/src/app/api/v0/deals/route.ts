import { NextRequest, NextResponse } from 'next/server';
import { authenticateV0Request, requireScope } from '@/lib/public-api-auth';
import { listDeals } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateV0Request(request);
  if (!auth.ok) return auth.response;
  const denied = requireScope(auth.scopes, 'deals:read');
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as any;
  const deals = await listDeals(auth.tenantId, {
    status,
    limit: Math.min(100, Number(searchParams.get('limit') || 50)),
  });
  return NextResponse.json({ data: deals });
}

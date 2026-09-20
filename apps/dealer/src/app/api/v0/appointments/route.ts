import { NextRequest, NextResponse } from 'next/server';
import { authenticateV0Request, requireScope } from '@/lib/public-api-auth';
import { getAppointments } from '@autodealers/crm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateV0Request(request);
  if (!auth.ok) return auth.response;
  const denied = requireScope(auth.scopes, 'appointments:read');
  if (denied) return denied;

  const appointments = await getAppointments(auth.tenantId);
  const limit = Math.min(100, Number(new URL(request.url).searchParams.get('limit') || 50));
  return NextResponse.json({
    data: (appointments || []).slice(0, limit),
  });
}

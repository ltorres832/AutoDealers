import { NextRequest, NextResponse } from 'next/server';
import {
  authenticatePublicApiKey,
  apiKeyHasScope,
  getTenantMembershipFeatures,
} from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function authenticateV0Request(request: NextRequest): Promise<
  | { ok: true; tenantId: string; keyId: string; scopes: string[] }
  | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get('authorization') || '';
  const raw =
    authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : request.headers.get('x-api-key')?.trim() || '';

  if (!raw) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing API key' }, { status: 401 }),
    };
  }

  const auth = await authenticatePublicApiKey(raw);
  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }),
    };
  }

  const features = await getTenantMembershipFeatures(auth.tenantId);
  if (features && features.publicApiEnabled === false) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Public API disabled for tenant' }, { status: 403 }),
    };
  }

  return { ok: true, ...auth };
}

export function requireScope(
  scopes: string[],
  required: string
): NextResponse | null {
  if (!apiKeyHasScope(scopes, required)) {
    return NextResponse.json({ error: `Missing scope: ${required}` }, { status: 403 });
  }
  return null;
}

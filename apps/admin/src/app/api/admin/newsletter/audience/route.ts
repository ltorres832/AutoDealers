export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getNewsletterAudience } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const includeUnsubscribed =
      new URL(request.url).searchParams.get('includeUnsubscribed') === 'true';

    const audience = await getNewsletterAudience({ includeUnsubscribed });
    const active = audience.filter((r) => r.status === 'active');

    return NextResponse.json({
      audience,
      stats: {
        total: audience.length,
        active: active.length,
        unsubscribed: audience.length - active.length,
        newsletterOnly: active.filter((r) =>
          r.sources.some((s) => s === 'landing_footer') &&
          !r.sources.includes('user_registration')
        ).length,
        registeredUsers: active.filter((r) => r.sources.includes('user_registration')).length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

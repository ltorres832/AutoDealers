export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listFeedJobs, saveFeedJob, runFeedJob } from '@autodealers/inventory';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const jobs = await listFeedJobs(auth.tenantId);
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const action = String(body.action || 'save');

    if (action === 'run') {
      const result = await runFeedJob(auth.tenantId, String(body.jobId || ''), body.commit === true);
      return NextResponse.json({ success: true, ...result });
    }

    const job = await saveFeedJob(auth.tenantId, {
      id: body.id ? String(body.id) : undefined,
      name: String(body.name || 'Feed'),
      feedUrl: String(body.feedUrl || ''),
      format: body.format === 'json' ? 'json' : 'csv',
      enabled: body.enabled !== false,
    });
    return NextResponse.json({ success: true, job });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

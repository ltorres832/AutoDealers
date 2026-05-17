import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { getCrmPipelineSettings } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getCrmPipelineSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error('crm-pipeline settings GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

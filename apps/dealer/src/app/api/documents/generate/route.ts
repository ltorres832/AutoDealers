export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isDealerPortalRole } from '@/lib/auth';
import { generateFromTemplateId, generateByDocumentType } from '@autodealers/core';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.tenantId || !isDealerPortalRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const options = {
      userId: auth.userId,
      status: (body.status === 'draft' ? 'draft' : 'final') as 'draft' | 'final',
      vehicleId: body.vehicleId,
      leadId: body.leadId,
      saleId: body.saleId,
    };

    let document;
    if (body.templateId) {
      document = await generateFromTemplateId(
        auth.tenantId,
        body.templateId,
        body.payload || {},
        options
      );
    } else if (body.type) {
      document = await generateByDocumentType(
        auth.tenantId,
        body.type,
        body.payload || {},
        options
      );
    } else {
      return NextResponse.json({ error: 'templateId o type requerido' }, { status: 400 });
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('documents generate', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requestDocument } from '@autodealers/crm';
import { canExecuteFeature, recordFeatureUsage } from '@autodealers/core';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gate = await canExecuteFeature(auth.tenantId, 'requestCustomerDocuments');
    if (!gate.allowed) {
      return NextResponse.json(
        { error: gate.reason || 'No permitido por membresía' },
        { status: 403 }
      );
    }

    const { fileId } = await params;
    const body = await request.json();
    const { name, type, description, required } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const requestedDoc = await requestDocument(
      auth.tenantId,
      fileId,
      name,
      type,
      description || '',
      required !== false,
      auth.userId
    );

    await recordFeatureUsage(auth.tenantId, 'requestCustomerDocuments', {
      customerFileId: fileId,
    });

    return NextResponse.json({ requestedDocument: requestedDoc, success: true });
  } catch (error: any) {
    console.error('Error requesting document:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}



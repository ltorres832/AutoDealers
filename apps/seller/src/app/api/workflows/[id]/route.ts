import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getWorkflows } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    // Actualizar workflow
    if (body.enabled !== undefined) {
      const db = getFirestore();
      await db
        .collection('tenants')
        .doc(auth.tenantId!)
        .collection('workflows')
        .doc(workflowId)
        .update({
          enabled: body.enabled,
          updatedAt: (await import('firebase-admin')).firestore.FieldValue.serverTimestamp(),
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Error updating workflow' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'TenantId is required' }, { status: 400 });
    }
    const workflows = await getWorkflows(auth.tenantId);
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching workflow' },
      { status: 500 }
    );
  }
}


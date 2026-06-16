import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getWorkflows, updateWorkflow } from '@autodealers/crm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const workflow = await updateWorkflow(auth.tenantId, workflowId, {
      name: body.name,
      description: body.description,
      enabled: body.enabled,
      trigger: body.trigger,
      triggerConfig: body.triggerConfig,
      conditions: body.conditions,
      actions: body.actions,
    });

    return NextResponse.json({ success: true, workflow });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating workflow';
    const status = message === 'Workflow not found' ? 404 : 500;
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workflows = await getWorkflows(auth.tenantId);
    const workflow = workflows.find((w) => w.id === workflowId);

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching workflow';
    console.error('Error fetching workflow:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

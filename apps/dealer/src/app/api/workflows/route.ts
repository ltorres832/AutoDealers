import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getWorkflows, createWorkflow, Workflow } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get('enabledOnly') === 'true';

    const workflows = await getWorkflows(auth.tenantId, enabledOnly);

    return NextResponse.json({ workflows });
  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const workflowData: Omit<Workflow, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'> = {
      tenantId: auth.tenantId,
      name: body.name,
      description: body.description,
      enabled: body.enabled !== false,
      trigger: body.trigger,
      triggerConfig: body.triggerConfig,
      conditions: body.conditions,
      actions: body.actions,
    };

    const workflow = await createWorkflow(auth.tenantId, workflowData);

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating workflow' },
      { status: 500 }
    );
  }
}


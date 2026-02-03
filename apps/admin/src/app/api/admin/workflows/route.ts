import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getWorkflows, createWorkflow, Workflow } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const enabledOnly = searchParams.get('enabledOnly') === 'true';

    // Si hay tenantId, obtener workflows de ese tenant
    if (tenantId) {
      const workflows = await getWorkflows(tenantId, enabledOnly);
      return NextResponse.json({ workflows });
    }

    // Si no hay tenantId, obtener workflows de todos los tenants
    const db = getFirestore();
    const tenantsSnapshot = await db.collection('tenants').get();
    const allWorkflows: Workflow[] = [];

    for (const tenantDoc of tenantsSnapshot.docs) {
      try {
        const tenantWorkflows = await getWorkflows(tenantDoc.id, enabledOnly);
        allWorkflows.push(...tenantWorkflows);
      } catch (error) {
        console.error(`Error fetching workflows for tenant ${tenantDoc.id}:`, error);
      }
    }

    return NextResponse.json({ workflows: allWorkflows });
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
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tenantId = body.tenantId || auth.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const workflowData: Omit<Workflow, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      name: body.name,
      description: body.description,
      enabled: body.enabled !== false,
      trigger: body.trigger,
      triggerConfig: body.triggerConfig,
      conditions: body.conditions,
      actions: body.actions,
    };

    const workflow = await createWorkflow(tenantId, workflowData);

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating workflow' },
      { status: 500 }
    );
  }
}



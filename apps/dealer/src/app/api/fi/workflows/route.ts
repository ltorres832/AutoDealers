import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createFIWorkflow, getFIWorkflows } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const workflows = await getFIWorkflows(auth.tenantId, activeOnly);

    return NextResponse.json({ workflows });
  } catch (error: any) {
    console.error('Error fetching FI workflows:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener workflows F&I' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const workflowData = body;

    const workflow = await createFIWorkflow(auth.tenantId, workflowData);

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error creating FI workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear workflow F&I' },
      { status: 500 }
    );
  }
}


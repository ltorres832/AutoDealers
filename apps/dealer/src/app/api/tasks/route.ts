import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTasks, createTask, Task } from '@autodealers/crm';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assignedTo = searchParams.get('assignedTo');
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status') as any;
    const type = searchParams.get('type') as any;
    const priority = searchParams.get('priority') as any;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const tasks = await getTasks(auth.tenantId, {
      assignedTo: assignedTo || undefined,
      leadId: leadId || undefined,
      status,
      type,
      priority,
      limit,
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching tasks' },
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
    const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'reminderSent'> = {
      tenantId: auth.tenantId,
      assignedTo: body.assignedTo || auth.userId,
      createdBy: auth.userId,
      type: body.type,
      title: body.title,
      description: body.description,
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      dueDate: new Date(body.dueDate),
      reminderDate: body.reminderDate ? new Date(body.reminderDate) : undefined,
      recurrence: body.recurrence || 'none',
      recurrenceEndDate: body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : undefined,
      leadId: body.leadId,
      metadata: body.metadata,
    };

    const task = await createTask(auth.tenantId, taskData);

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating task' },
      { status: 500 }
    );
  }
}


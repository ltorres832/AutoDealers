import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateTask, completeTask, getTasks } from '@autodealers/crm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    const updates: any = {};
    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.dueDate) updates.dueDate = new Date(body.dueDate);
    if (body.reminderDate) updates.reminderDate = new Date(body.reminderDate);
    if (body.assignedTo) updates.assignedTo = body.assignedTo;
    if (body.title) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'TenantId is required' }, { status: 400 });
    }
    await updateTask(auth.tenantId, taskId, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error.message || 'Error updating task' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    if (body.action === 'complete') {
      if (!auth.tenantId) {
        return NextResponse.json({ error: 'TenantId is required' }, { status: 400 });
      }
      await completeTask(auth.tenantId, taskId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: error.message || 'Error completing task' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'TenantId is required' }, { status: 400 });
    }
    const tasks = await getTasks(auth.tenantId, { limit: 1000 });
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching task' },
      { status: 500 }
    );
  }
}


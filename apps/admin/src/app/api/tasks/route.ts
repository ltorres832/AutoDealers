export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getTasks, createTask } from '@autodealers/crm';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const assignedTo = searchParams.get('assignedTo');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');

    const tasks = await getTasks(auth.tenantId, {
      leadId: leadId || undefined,
      assignedTo: assignedTo || undefined,
      status: status as any,
      type: type as any,
      priority: priority as any,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const {
      leadId,
      assignedTo,
      createdBy,
      type,
      title,
      description,
      priority,
      dueDate,
      reminderDate,
      recurrence,
      status,
    } = body;

    if (!assignedTo || !createdBy || !type || !title || !priority || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const task = await createTask(auth.tenantId, {
      tenantId: auth.tenantId,
      leadId: leadId || undefined,
      assignedTo,
      createdBy,
      type,
      title,
      description: description || undefined,
      priority,
      dueDate: new Date(dueDate),
      reminderDate: reminderDate ? new Date(reminderDate) : undefined,
      recurrence: recurrence || 'none',
      status: status || 'pending',
    });

    // Crear notificación para el usuario asignado
    try {
      const { createNotification } = await import('@autodealers/core');
      await createNotification({
        tenantId: auth.tenantId,
        userId: assignedTo,
        type: 'system_alert',
        title: 'Nueva tarea asignada',
        message: `Se te ha asignado una nueva tarea: ${title}`,
        channels: ['system'],
        metadata: {
          taskId: task.id,
          leadId: leadId || undefined,
          route: leadId ? `/leads/${leadId}` : '/tasks',
        },
      });
    } catch (notifError) {
      console.warn('No se pudo crear notificación:', notifError);
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

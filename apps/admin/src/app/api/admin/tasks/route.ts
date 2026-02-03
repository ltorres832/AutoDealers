import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTasks, createTask, Task } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const assignedTo = searchParams.get('assignedTo');
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status') as any;
    const type = searchParams.get('type') as any;
    const priority = searchParams.get('priority') as any;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Si hay tenantId, obtener tareas de ese tenant
    if (tenantId) {
      const tasks = await getTasks(tenantId, {
        assignedTo: assignedTo || undefined,
        leadId: leadId || undefined,
        status,
        type,
        priority,
        limit,
      });
      return NextResponse.json({ tasks });
    }

    // Si no hay tenantId, obtener tareas de todos los tenants
    const db = getFirestore();
    const tenantsSnapshot = await db.collection('tenants').get();
    const allTasks: Task[] = [];

    for (const tenantDoc of tenantsSnapshot.docs) {
      try {
        const tenantTasks = await getTasks(tenantDoc.id, {
          assignedTo: assignedTo || undefined,
          leadId: leadId || undefined,
          status,
          type,
          priority,
          limit: limit ? Math.ceil(limit / tenantsSnapshot.size) : undefined,
        });
        allTasks.push(...tenantTasks);
      } catch (error) {
        console.error(`Error fetching tasks for tenant ${tenantDoc.id}:`, error);
      }
    }

    // Aplicar límite global si se especificó
    const finalTasks = limit ? allTasks.slice(0, limit) : allTasks;

    return NextResponse.json({ tasks: finalTasks });
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
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tenantId = body.tenantId || auth.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'reminderSent'> = {
      tenantId,
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

    const task = await createTask(tenantId, taskData);

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating task' },
      { status: 500 }
    );
  }
}



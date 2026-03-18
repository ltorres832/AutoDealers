export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { updateTask } from '@autodealers/crm';
import { verifyAuth } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;
    const updateData: any = {};

    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.reminderDate !== undefined) {
      updateData.reminderDate = body.reminderDate ? new Date(body.reminderDate) : null;
    }
    if (body.assignedTo) updateData.assignedTo = body.assignedTo;
    if (body.recurrence) updateData.recurrence = body.recurrence;

    await updateTask(auth.tenantId, id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Por ahora, marcamos como cancelada en lugar de eliminar
    await updateTask(auth.tenantId, id, {
      status: 'cancelled',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

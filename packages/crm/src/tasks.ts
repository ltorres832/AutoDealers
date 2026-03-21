// Gestión de tareas y actividades

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

// Lazy initialization
function getDb() {
  return getFirestore();
}

export type TaskType = 'call' | 'email' | 'whatsapp' | 'meeting' | 'follow_up' | 'document' | 'custom';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Task {
  id: string;
  tenantId: string;
  leadId?: string;
  assignedTo: string; // userId
  createdBy: string; // userId
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  completedAt?: Date;
  reminderDate?: Date;
  reminderSent?: boolean;
  recurrence: TaskRecurrence;
  recurrenceEndDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea una nueva tarea
 */
export async function createTask(
  tenantId: string,
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'reminderSent'>
): Promise<Task> {
  const docRef = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('tasks')
    .doc();

  const task: Task = {
    id: docRef.id,
    ...taskData,
    reminderSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await docRef.set({
    ...task,
    dueDate: getFirestoreFieldValue().Timestamp.fromDate(task.dueDate),
    reminderDate: task.reminderDate ? getFirestoreFieldValue().Timestamp.fromDate(task.reminderDate) : null,
    recurrenceEndDate: task.recurrenceEndDate ? getFirestoreFieldValue().Timestamp.fromDate(task.recurrenceEndDate) : null,
    completedAt: null,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  } as any);

  return task;
}

/**
 * Obtiene tareas por tenant con filtros
 */
export async function getTasks(
  tenantId: string,
  filters?: {
    assignedTo?: string;
    leadId?: string;
    status?: TaskStatus;
    type?: TaskType;
    priority?: TaskPriority;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    limit?: number;
  }
): Promise<Task[]> {
  let query: any = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('tasks');

  if (filters?.assignedTo) {
    query = query.where('assignedTo', '==', filters.assignedTo);
  }

  if (filters?.leadId) {
    query = query.where('leadId', '==', filters.leadId);
  }

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters?.type) {
    query = query.where('type', '==', filters.type);
  }

  if (filters?.priority) {
    query = query.where('priority', '==', filters.priority);
  }

  query = query.orderBy('dueDate', 'asc');

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      dueDate: data.dueDate?.toDate() || new Date(),
      reminderDate: data.reminderDate?.toDate(),
      recurrenceEndDate: data.recurrenceEndDate?.toDate(),
      completedAt: data.completedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Task;
  });
}

/**
 * Actualiza una tarea
 */
export async function updateTask(
  tenantId: string,
  taskId: string,
  updates: Partial<Task>
): Promise<void> {
  const taskRef = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('tasks')
    .doc(taskId);

  const updateData: any = {
    ...updates,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  };

  if (updates.dueDate) {
    updateData.dueDate = getFirestoreFieldValue().Timestamp.fromDate(updates.dueDate);
  }

  if (updates.reminderDate) {
    updateData.reminderDate = getFirestoreFieldValue().Timestamp.fromDate(updates.reminderDate);
  }

  if (updates.completedAt) {
    updateData.completedAt = getFirestoreFieldValue().Timestamp.fromDate(updates.completedAt);
  }

  await taskRef.update(updateData);
}

/**
 * Completa una tarea
 */
export async function completeTask(
  tenantId: string,
  taskId: string
): Promise<void> {
  await updateTask(tenantId, taskId, {
    status: 'completed',
    completedAt: new Date(),
  });
}

/**
 * Obtiene tareas pendientes que necesitan recordatorio
 */
export async function getTasksNeedingReminder(tenantId: string): Promise<Task[]> {
  const now = new Date();
  const tasks = await getTasks(tenantId, {
    status: 'pending',
  });

  return tasks.filter(
    (task) =>
      task.reminderDate &&
      task.reminderDate <= now &&
      !task.reminderSent
  );
}

/**
 * Marca recordatorio como enviado
 */
export async function markReminderSent(
  tenantId: string,
  taskId: string
): Promise<void> {
  await updateTask(tenantId, taskId, {
    reminderSent: true,
  });
}



export type TaskType = 'call' | 'email' | 'whatsapp' | 'meeting' | 'follow_up' | 'document' | 'custom';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export interface Task {
    id: string;
    tenantId: string;
    leadId?: string;
    assignedTo: string;
    createdBy: string;
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
export declare function createTask(tenantId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'reminderSent'>): Promise<Task>;
/**
 * Obtiene tareas por tenant con filtros
 */
export declare function getTasks(tenantId: string, filters?: {
    assignedTo?: string;
    leadId?: string;
    status?: TaskStatus;
    type?: TaskType;
    priority?: TaskPriority;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    limit?: number;
}): Promise<Task[]>;
/**
 * Actualiza una tarea
 */
export declare function updateTask(tenantId: string, taskId: string, updates: Partial<Task>): Promise<void>;
/**
 * Completa una tarea
 */
export declare function completeTask(tenantId: string, taskId: string): Promise<void>;
/**
 * Obtiene tareas pendientes que necesitan recordatorio
 */
export declare function getTasksNeedingReminder(tenantId: string): Promise<Task[]>;
/**
 * Marca recordatorio como enviado
 */
export declare function markReminderSent(tenantId: string, taskId: string): Promise<void>;
//# sourceMappingURL=tasks.d.ts.map
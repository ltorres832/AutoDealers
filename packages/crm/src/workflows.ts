// Sistema de workflows automatizados

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

// Lazy initialization
function getDb() {
  return getFirestore();
}

export type WorkflowTrigger =
  | 'lead_created'
  | 'lead_status_changed'
  | 'lead_score_changed'
  | 'lead_no_response'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'message_received'
  | 'task_completed'
  | 'document_uploaded'
  | 'custom';

export type WorkflowAction =
  | 'change_status'
  | 'assign_to_user'
  | 'send_email'
  | 'send_whatsapp'
  | 'send_sms'
  | 'create_task'
  | 'add_tag'
  | 'update_score'
  | 'notify_user'
  | 'trigger_workflow'
  | 'custom';

export type WorkflowConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'exists' | 'not_exists';

export interface WorkflowCondition {
  field: string;
  operator: WorkflowConditionOperator;
  value: any;
}

export interface WorkflowActionConfig {
  type: WorkflowAction;
  config: Record<string, any>;
  delay?: number; // Segundos de retraso antes de ejecutar
}

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  triggerConfig?: Record<string, any>;
  conditions?: WorkflowCondition[]; // Condiciones que deben cumplirse
  actions: WorkflowActionConfig[];
  executionCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  tenantId: string;
  leadId?: string;
  triggerData: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  actionsExecuted: string[];
  actionsFailed: string[];
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Crea un nuevo workflow
 */
export async function createWorkflow(
  tenantId: string,
  workflowData: Omit<Workflow, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'>
): Promise<Workflow> {
  const docRef = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc();

  const workflow: Workflow = {
    id: docRef.id,
    ...workflowData,
    executionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await docRef.set({
    ...workflow,
    lastExecutedAt: null,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  } as any);

  return workflow;
}

/**
 * Obtiene workflows por tenant
 */
export async function getWorkflows(
  tenantId: string,
  enabledOnly?: boolean
): Promise<Workflow[]> {
  let query: any = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows');

  if (enabledOnly) {
    query = query.where('enabled', '==', true);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      lastExecutedAt: data.lastExecutedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Workflow;
  });
}

/**
 * Actualiza un workflow existente
 */
export async function updateWorkflow(
  tenantId: string,
  workflowId: string,
  updates: Partial<
    Pick<
      Workflow,
      | 'name'
      | 'description'
      | 'enabled'
      | 'trigger'
      | 'triggerConfig'
      | 'conditions'
      | 'actions'
    >
  >
): Promise<Workflow> {
  const ref = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId);

  const existing = await ref.get();
  if (!existing.exists) {
    throw new Error('Workflow not found');
  }

  const payload: Record<string, unknown> = {
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  };

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.enabled !== undefined) payload.enabled = updates.enabled;
  if (updates.trigger !== undefined) payload.trigger = updates.trigger;
  if (updates.triggerConfig !== undefined) payload.triggerConfig = updates.triggerConfig;
  if (updates.conditions !== undefined) payload.conditions = updates.conditions;
  if (updates.actions !== undefined) payload.actions = updates.actions;

  await ref.update(payload);

  const data = (await ref.get()).data()!;
  return {
    id: workflowId,
    tenantId,
    ...data,
    lastExecutedAt: data.lastExecutedAt?.toDate?.(),
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  } as Workflow;
}

/**
 * Ejecuta un workflow
 */
export async function executeWorkflow(
  tenantId: string,
  workflowId: string,
  triggerData: Record<string, any>
): Promise<WorkflowExecution> {
  const workflowDoc = await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .get();

  if (!workflowDoc.exists) {
    throw new Error('Workflow not found');
  }

  const workflow = workflowDoc.data() as Workflow;

  if (!workflow.enabled) {
    throw new Error('Workflow is disabled');
  }

  // Verificar condiciones
  if (workflow.conditions && workflow.conditions.length > 0) {
    const conditionsMet = workflow.conditions.every(condition => {
      return evaluateCondition(triggerData, condition);
    });

    if (!conditionsMet) {
      throw new Error('Workflow conditions not met');
    }
  }

  // Crear ejecución
  const executionRef = getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('workflow_executions')
    .doc();

  const execution: WorkflowExecution = {
    id: executionRef.id,
    workflowId,
    tenantId,
    leadId: triggerData.leadId,
    triggerData,
    status: 'running',
    actionsExecuted: [],
    actionsFailed: [],
    startedAt: new Date(),
  };

  await executionRef.set({
    ...execution,
    startedAt: getFirestoreFieldValue().Timestamp.fromDate(execution.startedAt),
  } as any);

  // Ejecutar acciones
  try {
    for (const action of workflow.actions) {
      if (action.delay) {
        await new Promise(resolve => setTimeout(resolve, (action.delay || 0) * 1000));
      }

      await executeAction(tenantId, action, triggerData);
      execution.actionsExecuted.push(action.type);
    }

    execution.status = 'completed';
    execution.completedAt = new Date();
  } catch (error: any) {
    execution.status = 'failed';
    execution.error = error.message;
    execution.completedAt = new Date();
  }

  await executionRef.update({
    ...execution,
    completedAt: execution.completedAt ? getFirestoreFieldValue().Timestamp.fromDate(execution.completedAt) : null,
  } as any);

  // Actualizar contador de ejecuciones del workflow
  await getDb()
    .collection('tenants')
    .doc(tenantId)
    .collection('workflows')
    .doc(workflowId)
    .update({
      executionCount: getFirestoreFieldValue().increment(1),
      lastExecutedAt: getFirestoreFieldValue().serverTimestamp(),
    });

  return execution;
}

/**
 * Evalúa una condición
 */
function evaluateCondition(data: Record<string, any>, condition: WorkflowCondition): boolean {
  const value = data[condition.field];

  switch (condition.operator) {
    case 'equals':
      return value === condition.value;
    case 'not_equals':
      return value !== condition.value;
    case 'greater_than':
      return Number(value) > Number(condition.value);
    case 'less_than':
      return Number(value) < Number(condition.value);
    case 'contains':
      return String(value).includes(String(condition.value));
    case 'not_contains':
      return !String(value).includes(String(condition.value));
    case 'exists':
      return value !== undefined && value !== null;
    case 'not_exists':
      return value === undefined || value === null;
    default:
      return false;
  }
}

/**
 * Ejecuta una acción del workflow
 */
async function executeAction(
  tenantId: string,
  action: WorkflowActionConfig,
  triggerData: Record<string, any>
): Promise<void> {
  switch (action.type) {
    case 'change_status':
      const { updateLead } = await import('./leads');
      await updateLead(tenantId, triggerData.leadId, {
        status: action.config.status,
      } as any);
      break;

    case 'assign_to_user':
      const { updateLead: updateLeadAssign } = await import('./leads');
      await updateLeadAssign(tenantId, triggerData.leadId, {
        assignedTo: action.config.userId,
      } as any);
      break;

    case 'send_email': {
      const { getLeadById } = await import('./leads');
      const { sendOutboundEmail } = await import('@autodealers/core');
      const lead = triggerData.leadId
        ? await getLeadById(tenantId, triggerData.leadId)
        : null;
      const to = action.config.to || lead?.contact?.email;
      if (!to) break;

      const subject =
        action.config.subject ||
        action.config.title ||
        'Mensaje de seguimiento';
      const content =
        action.config.content ||
        action.config.body ||
        action.config.message ||
        '';

      await sendOutboundEmail(String(to), String(subject), String(content), tenantId);
      break;
    }

    case 'send_whatsapp': {
      const { getLeadById } = await import('./leads');
      const { sendOutboundWhatsApp } = await import('@autodealers/core');
      const lead = triggerData.leadId
        ? await getLeadById(tenantId, triggerData.leadId)
        : null;
      const phone = action.config.phone || lead?.contact?.phone;
      if (!phone) break;

      const content =
        action.config.content ||
        action.config.body ||
        action.config.message ||
        '';

      await sendOutboundWhatsApp(String(phone), String(content), tenantId);
      break;
    }

    case 'send_sms': {
      const { getLeadById } = await import('./leads');
      const { sendOutboundSms } = await import('@autodealers/core');
      const lead = triggerData.leadId
        ? await getLeadById(tenantId, triggerData.leadId)
        : null;
      const phone = action.config.phone || lead?.contact?.phone;
      if (!phone) break;

      const content =
        action.config.content ||
        action.config.body ||
        action.config.message ||
        '';

      await sendOutboundSms(String(phone), String(content), tenantId);
      break;
    }

    case 'create_task':
      const { createTask } = await import('./tasks');
      await createTask(tenantId, {
        tenantId,
        leadId: triggerData.leadId,
        assignedTo: action.config.assignedTo || triggerData.assignedTo,
        createdBy: 'system',
        type: action.config.type || 'follow_up',
        title: action.config.title,
        description: action.config.description,
        status: 'pending',
        priority: action.config.priority || 'medium',
        dueDate: new Date(action.config.dueDate || Date.now() + 24 * 60 * 60 * 1000),
        recurrence: 'none',
      });
      break;

    case 'add_tag':
      const { getLeadById, updateLead: updateLeadTag } = await import('./leads');
      const lead = await getLeadById(tenantId, triggerData.leadId);
      if (lead) {
        const currentTags = lead.tags || [];
        const newTags = [...currentTags, action.config.tag].filter((t, i, arr) => arr.indexOf(t) === i);
        await updateLeadTag(tenantId, triggerData.leadId, {
          tags: newTags,
        } as any);
      }
      break;

    case 'update_score':
      const { updateLeadScore, calculateAutomaticScore } = await import('./scoring');
      const { getLeadById: getLeadForScore } = await import('./leads');
      const leadForScore = await getLeadForScore(tenantId, triggerData.leadId);
      if (leadForScore) {
        const autoScore = await calculateAutomaticScore(tenantId, leadForScore);
        await updateLeadScore(tenantId, triggerData.leadId, autoScore);
      }
      break;

    case 'notify_user':
      const { createNotification } = await import('@autodealers/core');
      await createNotification({
        tenantId,
        userId: action.config.userId,
        type: action.config.notificationType || 'workflow',
        title: action.config.title,
        message: action.config.message,
        channels: action.config.channels || ['system'],
        metadata: triggerData,
      });
      break;

    case 'trigger_workflow':
      const { executeWorkflow: triggerWorkflow } = await import('./workflows');
      await triggerWorkflow(tenantId, action.config.workflowId, triggerData);
      break;

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}


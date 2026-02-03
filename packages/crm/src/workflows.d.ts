export type WorkflowTrigger = 'lead_created' | 'lead_status_changed' | 'lead_score_changed' | 'lead_no_response' | 'appointment_confirmed' | 'appointment_cancelled' | 'message_received' | 'task_completed' | 'document_uploaded' | 'custom';
export type WorkflowAction = 'change_status' | 'assign_to_user' | 'send_email' | 'send_whatsapp' | 'send_sms' | 'create_task' | 'add_tag' | 'update_score' | 'notify_user' | 'trigger_workflow' | 'custom';
export type WorkflowConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
export interface WorkflowCondition {
    field: string;
    operator: WorkflowConditionOperator;
    value: any;
}
export interface WorkflowActionConfig {
    type: WorkflowAction;
    config: Record<string, any>;
    delay?: number;
}
export interface Workflow {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    enabled: boolean;
    trigger: WorkflowTrigger;
    triggerConfig?: Record<string, any>;
    conditions?: WorkflowCondition[];
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
export declare function createWorkflow(tenantId: string, workflowData: Omit<Workflow, 'id' | 'executionCount' | 'createdAt' | 'updatedAt'>): Promise<Workflow>;
/**
 * Obtiene workflows por tenant
 */
export declare function getWorkflows(tenantId: string, enabledOnly?: boolean): Promise<Workflow[]>;
/**
 * Ejecuta un workflow
 */
export declare function executeWorkflow(tenantId: string, workflowId: string, triggerData: Record<string, any>): Promise<WorkflowExecution>;
//# sourceMappingURL=workflows.d.ts.map
"use strict";
// Sistema de workflows automatizados
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorkflow = createWorkflow;
exports.getWorkflows = getWorkflows;
exports.executeWorkflow = executeWorkflow;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Crea un nuevo workflow
 */
async function createWorkflow(tenantId, workflowData) {
    const docRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('workflows')
        .doc();
    const workflow = {
        id: docRef.id,
        ...workflowData,
        executionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await docRef.set({
        ...workflow,
        lastExecutedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return workflow;
}
/**
 * Obtiene workflows por tenant
 */
async function getWorkflows(tenantId, enabledOnly) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('workflows');
    if (enabledOnly) {
        query = query.where('enabled', '==', true);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            lastExecutedAt: data.lastExecutedAt?.toDate(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Ejecuta un workflow
 */
async function executeWorkflow(tenantId, workflowId, triggerData) {
    const workflowDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('workflows')
        .doc(workflowId)
        .get();
    if (!workflowDoc.exists) {
        throw new Error('Workflow not found');
    }
    const workflow = workflowDoc.data();
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
    const executionRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('workflow_executions')
        .doc();
    const execution = {
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
        startedAt: admin.firestore.Timestamp.fromDate(execution.startedAt),
    });
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
    }
    catch (error) {
        execution.status = 'failed';
        execution.error = error.message;
        execution.completedAt = new Date();
    }
    await executionRef.update({
        ...execution,
        completedAt: execution.completedAt ? admin.firestore.Timestamp.fromDate(execution.completedAt) : null,
    });
    // Actualizar contador de ejecuciones del workflow
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('workflows')
        .doc(workflowId)
        .update({
        executionCount: admin.firestore.FieldValue.increment(1),
        lastExecutedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return execution;
}
/**
 * Evalúa una condición
 */
function evaluateCondition(data, condition) {
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
async function executeAction(tenantId, action, triggerData) {
    switch (action.type) {
        case 'change_status':
            const { updateLead } = await Promise.resolve().then(() => __importStar(require('./leads')));
            await updateLead(tenantId, triggerData.leadId, {
                status: action.config.status,
            });
            break;
        case 'assign_to_user':
            const { updateLead: updateLeadAssign } = await Promise.resolve().then(() => __importStar(require('./leads')));
            await updateLeadAssign(tenantId, triggerData.leadId, {
                assignedTo: action.config.userId,
            });
            break;
        case 'send_email':
            // TODO: Implementar envío de email
            break;
        case 'send_whatsapp':
            // TODO: Implementar envío de WhatsApp
            break;
        case 'send_sms':
            // TODO: Implementar envío de SMS
            break;
        case 'create_task':
            const { createTask } = await Promise.resolve().then(() => __importStar(require('./tasks')));
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
            const { getLeadById, updateLead: updateLeadTag } = await Promise.resolve().then(() => __importStar(require('./leads')));
            const lead = await getLeadById(tenantId, triggerData.leadId);
            if (lead) {
                const currentTags = lead.tags || [];
                const newTags = [...currentTags, action.config.tag].filter((t, i, arr) => arr.indexOf(t) === i);
                await updateLeadTag(tenantId, triggerData.leadId, {
                    tags: newTags,
                });
            }
            break;
        case 'update_score':
            const { updateLeadScore, calculateAutomaticScore } = await Promise.resolve().then(() => __importStar(require('./scoring')));
            const { getLeadById: getLeadForScore } = await Promise.resolve().then(() => __importStar(require('./leads')));
            const leadForScore = await getLeadForScore(tenantId, triggerData.leadId);
            if (leadForScore) {
                const autoScore = await calculateAutomaticScore(tenantId, leadForScore);
                await updateLeadScore(tenantId, triggerData.leadId, autoScore);
            }
            break;
        case 'notify_user':
            const { createNotification } = await Promise.resolve().then(() => __importStar(require('@autodealers/core')));
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
            const { executeWorkflow: triggerWorkflow } = await Promise.resolve().then(() => __importStar(require('./workflows')));
            await triggerWorkflow(tenantId, action.config.workflowId, triggerData);
            break;
        default:
            throw new Error(`Unknown action type: ${action.type}`);
    }
}
//# sourceMappingURL=workflows.js.map
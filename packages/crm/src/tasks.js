"use strict";
// Gestión de tareas y actividades
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
exports.createTask = createTask;
exports.getTasks = getTasks;
exports.updateTask = updateTask;
exports.completeTask = completeTask;
exports.getTasksNeedingReminder = getTasksNeedingReminder;
exports.markReminderSent = markReminderSent;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Crea una nueva tarea
 */
async function createTask(tenantId, taskData) {
    const docRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('tasks')
        .doc();
    const task = {
        id: docRef.id,
        ...taskData,
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    await docRef.set({
        ...task,
        dueDate: admin.firestore.Timestamp.fromDate(task.dueDate),
        reminderDate: task.reminderDate ? admin.firestore.Timestamp.fromDate(task.reminderDate) : null,
        recurrenceEndDate: task.recurrenceEndDate ? admin.firestore.Timestamp.fromDate(task.recurrenceEndDate) : null,
        completedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return task;
}
/**
 * Obtiene tareas por tenant con filtros
 */
async function getTasks(tenantId, filters) {
    let query = db
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
    return snapshot.docs.map((doc) => {
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
        };
    });
}
/**
 * Actualiza una tarea
 */
async function updateTask(tenantId, taskId, updates) {
    const taskRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('tasks')
        .doc(taskId);
    const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (updates.dueDate) {
        updateData.dueDate = admin.firestore.Timestamp.fromDate(updates.dueDate);
    }
    if (updates.reminderDate) {
        updateData.reminderDate = admin.firestore.Timestamp.fromDate(updates.reminderDate);
    }
    if (updates.completedAt) {
        updateData.completedAt = admin.firestore.Timestamp.fromDate(updates.completedAt);
    }
    await taskRef.update(updateData);
}
/**
 * Completa una tarea
 */
async function completeTask(tenantId, taskId) {
    await updateTask(tenantId, taskId, {
        status: 'completed',
        completedAt: new Date(),
    });
}
/**
 * Obtiene tareas pendientes que necesitan recordatorio
 */
async function getTasksNeedingReminder(tenantId) {
    const now = new Date();
    const tasks = await getTasks(tenantId, {
        status: 'pending',
    });
    return tasks.filter((task) => task.reminderDate &&
        task.reminderDate <= now &&
        !task.reminderSent);
}
/**
 * Marca recordatorio como enviado
 */
async function markReminderSent(tenantId, taskId) {
    await updateTask(tenantId, taskId, {
        reminderSent: true,
    });
}
//# sourceMappingURL=tasks.js.map
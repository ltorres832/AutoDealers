"use strict";
// Sistema de templates de comunicación (Email, SMS, WhatsApp)
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
exports.createTemplate = createTemplate;
exports.getTemplates = getTemplates;
exports.getTemplateById = getTemplateById;
exports.getActiveTemplateForEvent = getActiveTemplateForEvent;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
exports.replaceTemplateVariables = replaceTemplateVariables;
exports.replaceTemplateSubject = replaceTemplateSubject;
exports.initializeDefaultTemplates = initializeDefaultTemplates;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const communication_logs_1 = require("./communication-logs");
// Inicializar db de forma lazy para evitar problemas de inicialización
let db = null;
function getDb() {
    if (!db) {
        db = (0, shared_1.getFirestore)();
    }
    return db;
}
/**
 * Crea un nuevo template
 */
async function createTemplate(template, createdBy) {
    const firestore = getDb();
    const docRef = firestore.collection('communication_templates').doc();
    // Preparar datos sin valores undefined (Firestore no los acepta)
    const templateData = {
        name: template.name,
        type: template.type,
        event: template.event,
        content: template.content,
        variables: template.variables || [],
        isActive: template.isActive !== undefined ? template.isActive : true,
        isDefault: template.isDefault !== undefined ? template.isDefault : false,
        createdBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Solo agregar subject si existe (solo para emails)
    if (template.subject !== undefined && template.subject !== null) {
        templateData.subject = template.subject;
    }
    await docRef.set(templateData);
    const newTemplate = {
        id: docRef.id,
        ...template,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    // Notificar al admin sobre el nuevo template
    try {
        await (0, communication_logs_1.notifyAdminTemplateCreated)({
            templateId: docRef.id,
            templateName: template.name,
            type: template.type,
            event: template.event,
            createdBy,
        });
    }
    catch (notifyError) {
        console.error('Error notifying admin about new template:', notifyError);
        // No fallar la creación por error de notificación
    }
    return newTemplate;
}
/**
 * Obtiene todos los templates con filtros opcionales
 */
async function getTemplates(filters) {
    const firestore = getDb();
    let query = firestore.collection('communication_templates');
    if (filters?.type) {
        query = query.where('type', '==', filters.type);
    }
    if (filters?.event) {
        query = query.where('event', '==', filters.event);
    }
    if (filters?.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
    }
    let snapshot;
    try {
        // Intentar ordenar por createdAt
        snapshot = await query.orderBy('createdAt', 'desc').get();
    }
    catch (error) {
        // Si falla (puede ser por índice faltante), obtener sin ordenar
        console.warn('Error ordenando templates, obteniendo sin orden:', error);
        snapshot = await query.get();
    }
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
}
/**
 * Obtiene un template por ID
 */
async function getTemplateById(templateId) {
    const firestore = getDb();
    const doc = await firestore.collection('communication_templates').doc(templateId).get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Obtiene el template activo para un evento específico
 */
async function getActiveTemplateForEvent(event, type) {
    const templates = await getTemplates({ event, type, isActive: true });
    if (templates.length === 0) {
        return null;
    }
    // Preferir template no por defecto (personalizado)
    const customTemplate = templates.find(t => !t.isDefault);
    return customTemplate || templates[0];
}
/**
 * Actualiza un template
 */
async function updateTemplate(templateId, updates) {
    const firestore = getDb();
    // Filtrar valores undefined antes de actualizar
    const cleanUpdates = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Solo agregar campos que no sean undefined
    Object.keys(updates).forEach(key => {
        const value = updates[key];
        if (value !== undefined) {
            cleanUpdates[key] = value;
        }
    });
    await firestore.collection('communication_templates').doc(templateId).update(cleanUpdates);
}
/**
 * Elimina (desactiva) un template
 */
async function deleteTemplate(templateId) {
    const firestore = getDb();
    await firestore.collection('communication_templates').doc(templateId).update({
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Reemplaza variables en un template
 */
function replaceTemplateVariables(template, variables) {
    let content = template.content;
    // Reemplazar en contenido
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, String(value));
    }
    return content;
}
/**
 * Reemplaza variables en el subject de un template
 */
function replaceTemplateSubject(template, variables) {
    let subject = template.subject || '';
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, String(value));
    }
    return subject;
}
/**
 * Inicializa templates por defecto del sistema
 */
async function initializeDefaultTemplates() {
    const defaultTemplates = [
        // ========== EMAIL TEMPLATES ==========
        // Subscription Created
        {
            name: 'Suscripción Creada - Email',
            type: 'email',
            event: 'subscription_created',
            subject: '¡Bienvenido a {{membershipName}}!',
            content: 'Hola {{userName}},\n\n¡Bienvenido a AutoDealers!\n\nTu suscripción a {{membershipName}} ha sido activada exitosamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\nMonto: ${{amount}} {{currency}}\n\nEstamos emocionados de tenerte con nosotros. Si tienes alguna pregunta, no dudes en contactarnos.\n\nEquipo AutoDealers',
            variables: ['userName', 'membershipName', 'periodStart', 'periodEnd', 'amount', 'currency'],
            isActive: true,
            isDefault: true,
        },
        // Payment Success
        {
            name: 'Pago Exitoso - Email',
            type: 'email',
            event: 'payment_success',
            subject: 'Pago procesado exitosamente - {{membershipName}}',
            content: 'Hola {{userName}},\n\nTu pago de ${{amount}} {{currency}} para la membresía {{membershipName}} ha sido procesado exitosamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\n\nGracias por confiar en nosotros.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName', 'periodStart', 'periodEnd'],
            isActive: true,
            isDefault: true,
        },
        // Payment Failed
        {
            name: 'Pago Fallido - Email',
            type: 'email',
            event: 'payment_failed',
            subject: 'Pago fallido - Acción requerida',
            content: 'Hola {{userName}},\n\nNo pudimos procesar el pago de ${{amount}} {{currency}} para tu membresía {{membershipName}}.\n\nPor favor, actualiza tu método de pago para evitar la suspensión de tu cuenta.\n\nFecha límite: {{deadline}}\n\nPuedes actualizar tu método de pago desde tu panel de control.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName', 'deadline'],
            isActive: true,
            isDefault: true,
        },
        // Payment Reminder 3 Days
        {
            name: 'Recordatorio de Pago 3 Días - Email',
            type: 'email',
            event: 'payment_reminder_3days',
            subject: 'Recordatorio: Tu pago vence en {{days}} días',
            content: 'Hola {{userName}},\n\nEste es un recordatorio de que tu pago de ${{amount}} {{currency}} para {{membershipName}} vence en {{days}} días.\n\nPor favor, asegúrate de tener fondos suficientes en tu método de pago para evitar la suspensión de tu cuenta.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName', 'days'],
            isActive: true,
            isDefault: true,
        },
        // Payment Reminder 5 Days
        {
            name: 'Recordatorio de Pago 5 Días - Email',
            type: 'email',
            event: 'payment_reminder_5days',
            subject: 'URGENTE: Tu pago vence en {{days}} días',
            content: 'Hola {{userName}},\n\nTu pago de ${{amount}} {{currency}} para {{membershipName}} vence en {{days}} días.\n\nEs importante que actualices tu método de pago ahora para evitar la suspensión de tu cuenta.\n\nSi no se procesa el pago, tu cuenta será suspendida automáticamente.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName', 'days'],
            isActive: true,
            isDefault: true,
        },
        // Account Suspended
        {
            name: 'Cuenta Suspendida - Email',
            type: 'email',
            event: 'account_suspended',
            subject: 'Tu cuenta ha sido suspendida',
            content: 'Hola {{userName}},\n\nTu cuenta ha sido suspendida debido a falta de pago.\n\nPara reactivar tu cuenta, por favor realiza el pago pendiente de ${{amount}} {{currency}}.\n\nUna vez procesado el pago, tu cuenta será reactivada automáticamente.\n\nPuedes realizar el pago desde tu panel de control.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency'],
            isActive: true,
            isDefault: true,
        },
        // Account Reactivated
        {
            name: 'Cuenta Reactivada - Email',
            type: 'email',
            event: 'account_reactivated',
            subject: '¡Tu cuenta ha sido reactivada!',
            content: 'Hola {{userName}},\n\n¡Excelente noticia! Tu cuenta ha sido reactivada exitosamente.\n\nTu pago de ${{amount}} {{currency}} ha sido procesado y tu suscripción a {{membershipName}} está activa nuevamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\n\nGracias por confiar en nosotros.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName', 'periodStart', 'periodEnd'],
            isActive: true,
            isDefault: true,
        },
        // Subscription Cancelled
        {
            name: 'Suscripción Cancelada - Email',
            type: 'email',
            event: 'subscription_cancelled',
            subject: 'Tu suscripción ha sido cancelada',
            content: `Hola {{userName}},

Tu suscripción a {{membershipName}} ha sido cancelada.

Tu acceso continuará hasta el final del período actual: {{periodEnd}}.

Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento desde tu panel de control.

Gracias por haber sido parte de AutoDealers.

Equipo AutoDealers`,
            variables: ['userName', 'membershipName', 'periodEnd'],
            isActive: true,
            isDefault: true,
        },
        // Trial Ending
        {
            name: 'Prueba Terminando - Email',
            type: 'email',
            event: 'trial_ending',
            subject: 'Tu período de prueba está por terminar',
            content: `Hola {{userName}},

Tu período de prueba de {{membershipName}} está por terminar.

Para continuar disfrutando de todos los beneficios, asegúrate de tener un método de pago configurado.

El período de prueba termina el: {{periodEnd}}

Equipo AutoDealers`,
            variables: ['userName', 'membershipName', 'periodEnd'],
            isActive: true,
            isDefault: true,
        },
        // Invoice Generated
        {
            name: 'Factura Generada - Email',
            type: 'email',
            event: 'invoice_generated',
            subject: 'Nueva factura disponible - {{membershipName}}',
            content: 'Hola {{userName}},\n\nSe ha generado una nueva factura para tu suscripción a {{membershipName}}.\n\nMonto: ${{amount}} {{currency}}\nPeríodo: {{periodStart}} - {{periodEnd}}\n\nLa factura se procesará automáticamente según tu método de pago configurado.\n\nEquipo AutoDealers',
            variables: ['userName', 'membershipName', 'amount', 'currency', 'periodStart', 'periodEnd'],
            isActive: true,
            isDefault: true,
        },
        // ========== SMS TEMPLATES ==========
        // Payment Success SMS
        {
            name: 'Pago Exitoso - SMS',
            type: 'sms',
            event: 'payment_success',
            content: 'Hola {{userName}}, tu pago de ${{amount}} para {{membershipName}} fue procesado exitosamente. Gracias! - AutoDealers',
            variables: ['userName', 'amount', 'membershipName'],
            isActive: true,
            isDefault: true,
        },
        // Payment Failed SMS
        {
            name: 'Pago Fallido - SMS',
            type: 'sms',
            event: 'payment_failed',
            content: 'Hola {{userName}}, no pudimos procesar tu pago de ${{amount}}. Actualiza tu método de pago para evitar suspensión. - AutoDealers',
            variables: ['userName', 'amount'],
            isActive: true,
            isDefault: true,
        },
        // Payment Reminder 3 Days SMS
        {
            name: 'Recordatorio 3 Días - SMS',
            type: 'sms',
            event: 'payment_reminder_3days',
            content: 'Hola {{userName}}, tu pago de ${{amount}} vence en {{days}} días. Actualiza tu método de pago para evitar suspensión. - AutoDealers',
            variables: ['userName', 'amount', 'days'],
            isActive: true,
            isDefault: true,
        },
        // Payment Reminder 5 Days SMS
        {
            name: 'Recordatorio 5 Días - SMS',
            type: 'sms',
            event: 'payment_reminder_5days',
            content: 'URGENTE {{userName}}: Tu pago de ${{amount}} vence en {{days}} días. Actualiza tu método de pago ahora. - AutoDealers',
            variables: ['userName', 'amount', 'days'],
            isActive: true,
            isDefault: true,
        },
        // Account Suspended SMS
        {
            name: 'Cuenta Suspendida - SMS',
            type: 'sms',
            event: 'account_suspended',
            content: 'Hola {{userName}}, tu cuenta fue suspendida por falta de pago. Realiza el pago de ${{amount}} para reactivar. - AutoDealers',
            variables: ['userName', 'amount'],
            isActive: true,
            isDefault: true,
        },
        // Account Reactivated SMS
        {
            name: 'Cuenta Reactivada - SMS',
            type: 'sms',
            event: 'account_reactivated',
            content: `Hola {{userName}}, tu cuenta ha sido reactivada exitosamente. Tu pago fue procesado. Gracias! - AutoDealers`,
            variables: ['userName'],
            isActive: true,
            isDefault: true,
        },
        // ========== WHATSAPP TEMPLATES ==========
        // Payment Success WhatsApp
        {
            name: 'Pago Exitoso - WhatsApp',
            type: 'whatsapp',
            event: 'payment_success',
            content: 'Hola {{userName}}\n\nTu pago de *${{amount}} {{currency}}* para {{membershipName}} ha sido procesado exitosamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\n\nGracias por confiar en nosotros!\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName', 'periodStart', 'periodEnd'],
            isActive: true,
            isDefault: true,
        },
        // Payment Failed WhatsApp
        {
            name: 'Pago Fallido - WhatsApp',
            type: 'whatsapp',
            event: 'payment_failed',
            content: 'Hola {{userName}}\n\nNo pudimos procesar tu pago de *${{amount}} {{currency}}* para {{membershipName}}.\n\nPor favor, actualiza tu método de pago para evitar la suspensión de tu cuenta.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName'],
            isActive: true,
            isDefault: true,
        },
        // Payment Reminder 3 Days WhatsApp
        {
            name: 'Recordatorio 3 Días - WhatsApp',
            type: 'whatsapp',
            event: 'payment_reminder_3days',
            content: 'Hola {{userName}}\n\nRecordatorio: Tu pago de *${{amount}} {{currency}}* para {{membershipName}} vence en *{{days}} días*.\n\nAsegúrate de tener fondos suficientes en tu método de pago.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName', 'days'],
            isActive: true,
            isDefault: true,
        },
        // Payment Reminder 5 Days WhatsApp
        {
            name: 'Recordatorio 5 Días - WhatsApp',
            type: 'whatsapp',
            event: 'payment_reminder_5days',
            content: 'Hola {{userName}}\n\n*URGENTE*: Tu pago de *${{amount}} {{currency}}* para {{membershipName}} vence en *{{days}} días*.\n\nActualiza tu método de pago ahora para evitar la suspensión de tu cuenta.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName', 'days'],
            isActive: true,
            isDefault: true,
        },
        // Account Suspended WhatsApp
        {
            name: 'Cuenta Suspendida - WhatsApp',
            type: 'whatsapp',
            event: 'account_suspended',
            content: 'Hola {{userName}} ⛔\n\nTu cuenta ha sido suspendida debido a falta de pago.\n\nPara reactivar, realiza el pago pendiente de *${{amount}} {{currency}}*.\n\nUna vez procesado, tu cuenta será reactivada automáticamente.\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency'],
            isActive: true,
            isDefault: true,
        },
        // Account Reactivated WhatsApp
        {
            name: 'Cuenta Reactivada - WhatsApp',
            type: 'whatsapp',
            event: 'account_reactivated',
            content: 'Hola {{userName}} 🎉\n\n¡Excelente noticia! Tu cuenta ha sido reactivada exitosamente.\n\nTu pago de *${{amount}} {{currency}}* fue procesado y tu suscripción a {{membershipName}} está activa nuevamente.\n\nGracias por confiar en nosotros!\n\nEquipo AutoDealers',
            variables: ['userName', 'amount', 'currency', 'membershipName'],
            isActive: true,
            isDefault: true,
        },
        // Subscription Created WhatsApp
        {
            name: 'Suscripción Creada - WhatsApp',
            type: 'whatsapp',
            event: 'subscription_created',
            content: 'Hola {{userName}}\n\n¡Bienvenido a AutoDealers!\n\nTu suscripción a *{{membershipName}}* ha sido activada exitosamente.\n\nPeríodo: {{periodStart}} - {{periodEnd}}\nMonto: *${{amount}} {{currency}}*\n\nEstamos emocionados de tenerte con nosotros!\n\nEquipo AutoDealers',
            variables: ['userName', 'membershipName', 'periodStart', 'periodEnd', 'amount', 'currency'],
            isActive: true,
            isDefault: true,
        },
    ];
    // Verificar si ya existen templates por defecto para evitar duplicados
    let existing = [];
    try {
        existing = await getTemplates({ isActive: true });
    }
    catch (error) {
        console.warn('Error obteniendo templates existentes, continuando con la creación:', error);
    }
    const existingEvents = new Set(existing.map(t => `${t.type}-${t.event}`));
    let created = 0;
    let skipped = 0;
    let errors = 0;
    // Crear solo los templates que no existen
    for (const template of defaultTemplates) {
        const key = `${template.type}-${template.event}`;
        if (!existingEvents.has(key)) {
            try {
                await createTemplate(template, 'system');
                created++;
                console.log(`✓ Template creado: ${template.name} (${template.type} - ${template.event})`);
            }
            catch (error) {
                errors++;
                console.error(`✗ Error creando template ${template.name}:`, error);
            }
        }
        else {
            skipped++;
            console.log(`⊘ Template ya existe, omitido: ${template.name} (${template.type} - ${template.event})`);
        }
    }
    console.log(`Templates por defecto procesados: ${created} creados, ${skipped} omitidos, ${errors} errores`);
    if (created === 0 && errors === 0) {
        console.log('Todos los templates ya existen en el sistema');
    }
}

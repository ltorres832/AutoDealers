"use strict";
// Sistema de templates
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
exports.getTemplateById = getTemplateById;
exports.getTemplates = getTemplates;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
exports.processTemplate = processTemplate;
exports.getDefaultTemplate = getDefaultTemplate;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
    return (0, shared_1.getFirestore)();
}
/**
 * Crea un nuevo template
 */
async function createTemplate(template, tenantId) {
    const docRef = getDb().collection('templates').doc();
    const templateData = {
        ...template,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Si se proporciona tenantId, agregarlo (para templates personalizados por tenant)
    if (tenantId) {
        templateData.tenantId = tenantId;
    }
    await docRef.set(templateData);
    return {
        id: docRef.id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene un template por ID
 */
async function getTemplateById(templateId) {
    const templateDoc = await getDb().collection('templates').doc(templateId).get();
    if (!templateDoc.exists) {
        return null;
    }
    const data = templateDoc.data();
    return {
        id: templateDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}
/**
 * Obtiene templates por tipo y rol
 */
async function getTemplates(type, role) {
    let query = getDb().collection('templates');
    if (type) {
        query = query.where('type', '==', type);
    }
    const snapshot = await query.get();
    // Filtrar por rol en memoria si es necesario
    let templates = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    });
    // Filtrar por rol si es necesario
    if (role && role !== 'all') {
        templates = templates.filter(t => t.role === role || t.role === 'all');
    }
    // Ordenar por nombre
    templates.sort((a, b) => a.name.localeCompare(b.name));
    return templates;
}
/**
 * Actualiza un template
 */
async function updateTemplate(templateId, updates) {
    await getDb().collection('templates').doc(templateId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * Elimina un template
 */
async function deleteTemplate(templateId) {
    await getDb().collection('templates').doc(templateId).delete();
}
/**
 * Procesa un template con variables
 */
function processTemplate(template, variables) {
    let content = template.content;
    let subject = template.subject;
    // Reemplazar variables
    template.variables.forEach((variable) => {
        const value = variables[variable] || `{{${variable}}}`;
        const regex = new RegExp(`{{\\s*${variable}\\s*}}`, 'g');
        content = content.replace(regex, value);
        if (subject) {
            subject = subject.replace(regex, value);
        }
    });
    return { subject, content };
}
/**
 * Obtiene template por defecto
 */
async function getDefaultTemplate(type, role) {
    const snapshot = await getDb().collection('templates')
        .where('type', '==', type)
        .where('isDefault', '==', true)
        .where('role', 'in', [role, 'all'])
        .limit(1)
        .get();
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}

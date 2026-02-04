"use strict";
// Gestión de plantillas de contratos
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
exports.createContractTemplate = createContractTemplate;
exports.getContractTemplates = getContractTemplates;
exports.getContractTemplateById = getContractTemplateById;
exports.generateContractFromTemplate = generateContractFromTemplate;
const core_1 = require("@autodealers/core");
const admin = __importStar(require("firebase-admin"));
const db = (0, core_1.getFirestore)();
/**
 * Crea una nueva plantilla de contrato
 */
async function createContractTemplate(tenantId, templateData) {
    const templateRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('contract-templates')
        .doc();
    const template = {
        ...templateData,
        tenantId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await templateRef.set(template);
    return {
        id: templateRef.id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Obtiene todas las plantillas activas de un tenant
 */
async function getContractTemplates(tenantId, type) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('contract-templates')
        .where('isActive', '==', true);
    if (type) {
        query = query.where('type', '==', type);
    }
    const snapshot = await query.orderBy('name').get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        const createdAt = data?.createdAt;
        const updatedAt = data?.updatedAt;
        return {
            id: doc.id,
            ...data,
            createdAt: (createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate() : createdAt) || new Date(),
            updatedAt: (updatedAt && typeof updatedAt.toDate === 'function' ? updatedAt.toDate() : updatedAt) || new Date(),
        };
    });
}
/**
 * Obtiene una plantilla por ID
 */
async function getContractTemplateById(tenantId, templateId) {
    const templateDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('contract-templates')
        .doc(templateId)
        .get();
    if (!templateDoc.exists) {
        return null;
    }
    const data = templateDoc.data();
    const createdAt = data?.createdAt;
    const updatedAt = data?.updatedAt;
    return {
        id: templateDoc.id,
        ...data,
        createdAt: (createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate() : createdAt) || new Date(),
        updatedAt: (updatedAt && typeof updatedAt.toDate === 'function' ? updatedAt.toDate() : updatedAt) || new Date(),
    };
}
/**
 * Genera un contrato desde una plantilla con datos llenados
 */
async function generateContractFromTemplate(tenantId, templateId, fieldValues, saleId, leadId, vehicleId) {
    const template = await getContractTemplateById(tenantId, templateId);
    if (!template) {
        throw new Error('Template not found');
    }
    // TODO: Aquí se integraría con un servicio de PDF para llenar los campos
    // Por ahora, creamos el contrato con la plantilla como documento original
    // y luego se puede procesar para llenar los campos
    const { createContract } = await Promise.resolve().then(() => __importStar(require('./contracts')));
    const contract = await createContract(tenantId, {
        name: template.name,
        type: template.type,
        originalDocumentUrl: template.templateDocumentUrl,
        saleId: saleId || undefined,
        leadId: leadId || undefined,
        vehicleId: vehicleId || undefined,
        digitalization: {
            status: 'completed',
            extractedFields: fieldValues,
            signatureFields: template.signatureFields.map(field => ({
                id: field.id,
                type: field.type,
                x: field.position.x,
                y: field.position.y,
                width: field.position.width,
                height: field.position.height,
                required: field.required,
                signer: field.signer,
                label: field.label,
            })),
            completedAt: new Date(),
        },
        createdBy: '', // Se llenará con el usuario actual
    });
    return {
        contractId: contract.id,
        documentUrl: template.templateDocumentUrl,
    };
}
//# sourceMappingURL=contract-templates.js.map
// Gestión de plantillas de contratos

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface ContractTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'purchase' | 'lease' | 'financing' | 'service' | 'warranty' | 'other';
  category: 'standard' | 'custom';
  
  // Documento PDF de la plantilla
  templateDocumentUrl: string;
  
  // Campos que se pueden llenar en la plantilla
  fillableFields: Array<{
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'address' | 'signature';
    required: boolean;
    placeholder?: string;
    defaultValue?: string;
    position?: {
      x: number; // Posición X en el PDF (0-1)
      y: number; // Posición Y en el PDF (0-1)
      width?: number;
      height?: number;
    };
  }>;
  
  // Campos de firma predefinidos
  signatureFields: Array<{
    id: string;
    type: 'signature' | 'initial' | 'date';
    signer: 'buyer' | 'seller' | 'dealer' | 'cosigner' | 'witness';
    required: boolean;
    label: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  
  // Metadata
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea una nueva plantilla de contrato
 */
export async function createContractTemplate(
  tenantId: string,
  templateData: Omit<ContractTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<ContractTemplate> {
  const templateRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('contract-templates')
    .doc();

  const template: Omit<ContractTemplate, 'id'> = {
    ...templateData,
    tenantId,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
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
export async function getContractTemplates(
  tenantId: string,
  type?: string
): Promise<ContractTemplate[]> {
  let query: any = db
    .collection('tenants')
    .doc(tenantId)
    .collection('contract-templates')
    .where('isActive', '==', true);

  if (type) {
    query = query.where('type', '==', type);
  }

  const snapshot = await query.orderBy('name').get();

  return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => {
    const data = doc.data();
    const createdAt = data?.createdAt;
    const updatedAt = data?.updatedAt;
    return {
      id: doc.id,
      ...data,
      createdAt: (createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate() : createdAt) || new Date(),
      updatedAt: (updatedAt && typeof updatedAt.toDate === 'function' ? updatedAt.toDate() : updatedAt) || new Date(),
    } as ContractTemplate;
  });
}

/**
 * Obtiene una plantilla por ID
 */
export async function getContractTemplateById(
  tenantId: string,
  templateId: string
): Promise<ContractTemplate | null> {
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
  } as ContractTemplate;
}

/**
 * Genera un contrato desde una plantilla con datos llenados
 */
export async function generateContractFromTemplate(
  tenantId: string,
  templateId: string,
  fieldValues: Record<string, any>,
  saleId?: string,
  leadId?: string,
  vehicleId?: string
): Promise<{ contractId: string; documentUrl: string }> {
  const template = await getContractTemplateById(tenantId, templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  // TODO: Aquí se integraría con un servicio de PDF para llenar los campos
  // Por ahora, creamos el contrato con la plantilla como documento original
  // y luego se puede procesar para llenar los campos
  
  const { createContract } = await import('./contracts');
  
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


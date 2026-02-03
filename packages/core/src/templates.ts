// Sistema de templates

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

export type TemplateType = 'email' | 'sms' | 'whatsapp' | 'message';

export type TemplateRole = 'admin' | 'dealer' | 'seller' | 'all';

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  role: TemplateRole;
  category: string;
  subject?: string;
  content: string;
  variables: string[];
  isDefault: boolean;
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea un nuevo template
 */
export async function createTemplate(
  template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>,
  tenantId?: string
): Promise<Template> {
  const docRef = getDb().collection('templates').doc();

  const templateData: any = {
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
export async function getTemplateById(
  templateId: string
): Promise<Template | null> {
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
  } as Template;
}

/**
 * Obtiene templates por tipo y rol
 */
export async function getTemplates(
  type?: TemplateType,
  role?: TemplateRole
): Promise<Template[]> {
  let query: admin.firestore.Query = getDb().collection('templates');

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
    } as Template;
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
export async function updateTemplate(
  templateId: string,
  updates: Partial<Template>
): Promise<void> {
  await getDb().collection('templates').doc(templateId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Elimina un template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  await getDb().collection('templates').doc(templateId).delete();
}

/**
 * Procesa un template con variables
 */
export function processTemplate(
  template: Template,
  variables: Record<string, string>
): { subject?: string; content: string } {
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
export async function getDefaultTemplate(
  type: TemplateType,
  role: TemplateRole
): Promise<Template | null> {
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
  } as Template;
}




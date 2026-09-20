import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import type { DocumentTemplate, DocumentTemplateType, DocumentEngine } from './types';
import { getSeedTemplateDefinitions } from './seed-templates';

function getDb() {
  return getFirestore();
}

function col(tenantId: string) {
  return getDb().collection('tenants').doc(tenantId).collection('document_templates');
}

function mapDoc(id: string, data: any): DocumentTemplate {
  return {
    ...(data as Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>),
    id,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  };
}

export async function listDocumentTemplates(
  tenantId: string,
  opts?: { includeInactive?: boolean; type?: DocumentTemplateType }
): Promise<DocumentTemplate[]> {
  let q: any = col(tenantId);
  if (!opts?.includeInactive) {
    q = q.where('isActive', '==', true);
  }
  if (opts?.type) {
    q = q.where('type', '==', opts.type);
  }
  const snap = await q.get();
  const list = snap.docs.map((d: any) => mapDoc(d.id, d.data()));
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDocumentTemplate(
  tenantId: string,
  templateId: string
): Promise<DocumentTemplate | null> {
  const doc = await col(tenantId).doc(templateId).get();
  if (!doc.exists) return null;
  return mapDoc(doc.id, doc.data()!);
}

export async function createDocumentTemplate(
  tenantId: string,
  createdBy: string,
  input: Partial<DocumentTemplate> & {
    name: string;
    type: DocumentTemplateType;
    engine: DocumentEngine;
  }
): Promise<DocumentTemplate> {
  const ref = col(tenantId).doc();
  const ts = getFirestoreFieldValue().serverTimestamp();
  const data = {
    tenantId,
    engine: input.engine,
    type: input.type,
    name: input.name,
    description: input.description || '',
    category: input.category || 'custom',
    isActive: input.isActive !== false,
    requiresSignature: Boolean(input.requiresSignature),
    layout: input.layout || { sections: [] },
    templateDocumentUrl: input.templateDocumentUrl || null,
    fillableFields: input.fillableFields || [],
    signatureFields: input.signatureFields || [],
    dataBindings: input.dataBindings || {},
    legalDefaults: input.legalDefaults || {},
    aiDraft: Boolean(input.aiDraft),
    sourceImageUrl: input.sourceImageUrl || null,
    aiModel: input.aiModel || null,
    aiConfidence: input.aiConfidence ?? null,
    createdBy,
    createdAt: ts,
    updatedAt: ts,
  };
  await ref.set(data);
  return mapDoc(ref.id, { ...data, createdAt: new Date(), updatedAt: new Date() });
}

export async function updateDocumentTemplate(
  tenantId: string,
  templateId: string,
  updates: Partial<DocumentTemplate>
): Promise<DocumentTemplate> {
  const ref = col(tenantId).doc(templateId);
  const clean: Record<string, unknown> = { updatedAt: getFirestoreFieldValue().serverTimestamp() };
  const allowed = [
    'name',
    'description',
    'type',
    'engine',
    'category',
    'isActive',
    'requiresSignature',
    'layout',
    'templateDocumentUrl',
    'fillableFields',
    'signatureFields',
    'dataBindings',
    'legalDefaults',
    'aiDraft',
    'sourceImageUrl',
    'aiModel',
    'aiConfidence',
  ] as const;
  for (const key of allowed) {
    if ((updates as any)[key] !== undefined) clean[key] = (updates as any)[key];
  }
  await ref.update(clean);
  const updated = await ref.get();
  return mapDoc(updated.id, updated.data()!);
}

export async function deleteDocumentTemplate(
  tenantId: string,
  templateId: string
): Promise<void> {
  // Soft delete
  await col(tenantId).doc(templateId).update({
    isActive: false,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
}

export async function duplicateDocumentTemplate(
  tenantId: string,
  templateId: string,
  createdBy: string
): Promise<DocumentTemplate> {
  const src = await getDocumentTemplate(tenantId, templateId);
  if (!src) throw new Error('Plantilla no encontrada');
  return createDocumentTemplate(tenantId, createdBy, {
    ...src,
    name: `${src.name} (copia)`,
    category: 'custom',
    aiDraft: false,
  });
}

/** Instala plantillas semilla legales si el tenant aún no tiene ninguna activa. */
export async function seedDocumentTemplatesIfEmpty(
  tenantId: string,
  createdBy: string,
  force = false
): Promise<{ created: number }> {
  const existing = await listDocumentTemplates(tenantId, { includeInactive: true });
  if (!force && existing.length > 0) {
    return { created: 0 };
  }
  const seeds = getSeedTemplateDefinitions();
  let created = 0;
  for (const seed of seeds) {
    await createDocumentTemplate(tenantId, createdBy, {
      engine: 'blocks',
      type: seed.type,
      name: seed.name,
      description: seed.description,
      category: 'standard',
      requiresSignature: seed.requiresSignature,
      layout: { sections: seed.sections },
    });
    created++;
  }
  return { created };
}

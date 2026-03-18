// Sistema de etiquetas y segmentación avanzada

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface Tag {
  id: string;
  tenantId: string;
  name: string;
  color: string; // Color hex
  description?: string;
  autoApply?: boolean; // Si se aplica automáticamente basado en reglas
  rule?: TagRule; // Regla para aplicación automática
  createdAt: Date;
  updatedAt: Date;
}

export interface TagRule {
  field: 'source' | 'status' | 'score' | 'interactions' | 'assignedTo';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists';
  value: any;
}

export interface Segment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: SegmentCondition[];
  leadIds?: string[]; // Cache de leads que cumplen condiciones
  leadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCondition {
  field: 'tags' | 'score' | 'source' | 'status' | 'assignedTo' | 'createdAt' | 'interestedVehicles' | 'budget';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greaterThan' | 'lessThan' | 'in' | 'not_in' | 'between';
  value: any;
}

/**
 * Crea una nueva etiqueta
 */
export async function createTag(
  tenantId: string,
  tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Tag> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('tags')
    .doc();

  const tag: Tag = {
    id: docRef.id,
    ...tagData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await docRef.set({
    ...tag,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return tag;
}

/**
 * Obtiene todas las etiquetas de un tenant
 */
export async function getTags(tenantId: string): Promise<Tag[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('tags')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Tag;
  });
}

/**
 * Actualiza una etiqueta
 */
export async function updateTag(
  tenantId: string,
  tagId: string,
  updates: Partial<Tag>
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('tags')
    .doc(tagId)
    .update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

/**
 * Elimina una etiqueta
 */
export async function deleteTag(tenantId: string, tagId: string): Promise<void> {
  // Remover etiqueta de todos los leads que la tienen
  const leadsSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .where('tags', 'array-contains', tagId)
    .get();

  const batch = db.batch();
  for (const leadDoc of leadsSnapshot.docs) {
    const currentTags = leadDoc.data().tags || [];
    const updatedTags = currentTags.filter((t: string) => t !== tagId);
    batch.update(leadDoc.ref, {
      tags: updatedTags,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Eliminar la etiqueta
  batch.delete(
    db.collection('tenants').doc(tenantId).collection('tags').doc(tagId)
  );

  await batch.commit();
}

/**
 * Aplica una etiqueta a un lead
 */
export async function addTagToLead(
  tenantId: string,
  leadId: string,
  tagId: string
): Promise<void> {
  const leadRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId);

  const leadDoc = await leadRef.get();
  if (!leadDoc.exists) {
    throw new Error('Lead not found');
  }

  const currentTags = leadDoc.data()?.tags || [];
  if (!currentTags.includes(tagId)) {
    await leadRef.update({
      tags: admin.firestore.FieldValue.arrayUnion(tagId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Remueve una etiqueta de un lead
 */
export async function removeTagFromLead(
  tenantId: string,
  leadId: string,
  tagId: string
): Promise<void> {
  const leadRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId);

  await leadRef.update({
    tags: admin.firestore.FieldValue.arrayRemove(tagId),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Crea un nuevo segmento
 */
export async function createSegment(
  tenantId: string,
  segmentData: Omit<Segment, 'id' | 'createdAt' | 'updatedAt' | 'leadIds' | 'leadCount'>
): Promise<Segment> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('segments')
    .doc();

  const segment: Segment = {
    id: docRef.id,
    ...segmentData,
    leadIds: [],
    leadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await docRef.set({
    ...segment,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  // Calcular leads del segmento
  await calculateSegmentLeads(tenantId, segment.id);

  return segment;
}

/**
 * Obtiene todos los segmentos de un tenant
 */
export async function getSegments(tenantId: string): Promise<Segment[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('segments')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Segment;
  });
}

/**
 * Calcula qué leads pertenecen a un segmento
 */
export async function calculateSegmentLeads(
  tenantId: string,
  segmentId: string
): Promise<string[]> {
  const segmentDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('segments')
    .doc(segmentId)
    .get();

  if (!segmentDoc.exists) {
    throw new Error('Segment not found');
  }

  const segment = segmentDoc.data() as Segment;
  const { getLeads } = await import('./leads');
  const allLeads = await getLeads(tenantId, {});

  const matchingLeads = allLeads.filter((lead) =>
    evaluateSegmentConditions(lead, segment.conditions)
  );

  const leadIds = matchingLeads.map((l) => l.id);

  // Actualizar segmento con los IDs
  await segmentDoc.ref.update({
    leadIds,
    leadCount: leadIds.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return leadIds;
}

/**
 * Evalúa si un lead cumple las condiciones de un segmento
 */
function evaluateSegmentConditions(
  lead: any,
  conditions: SegmentCondition[]
): boolean {
  return conditions.every((condition) => {
    const value = getLeadFieldValue(lead, condition.field);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'not_contains':
        return !String(value).includes(String(condition.value));
      case 'greaterThan':
        return Number(value) > Number(condition.value);
      case 'lessThan':
        return Number(value) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'between':
        return (
          Array.isArray(condition.value) &&
          condition.value.length === 2 &&
          Number(value) >= Number(condition.value[0]) &&
          Number(value) <= Number(condition.value[1])
        );
      default:
        return false;
    }
  });
}

/**
 * Obtiene el valor de un campo del lead
 */
function getLeadFieldValue(lead: any, field: string): any {
  switch (field) {
    case 'tags':
      return lead.tags || [];
    case 'score':
      return lead.score?.combined || 0;
    case 'source':
      return lead.source;
    case 'status':
      return lead.status;
    case 'assignedTo':
      return lead.assignedTo;
    case 'createdAt':
      return lead.createdAt;
    case 'interestedVehicles':
      return lead.interestedVehicles || [];
    case 'budget':
      return lead.metadata?.budget || 0;
    default:
      return null;
  }
}

/**
 * Obtiene los leads de un segmento
 */
export async function getSegmentLeads(
  tenantId: string,
  segmentId: string
): Promise<any[]> {
  const segmentDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('segments')
    .doc(segmentId)
    .get();

  if (!segmentDoc.exists) {
    throw new Error('Segment not found');
  }

  const segment = segmentDoc.data() as Segment;
  const { getLeads } = await import('./leads');

  if (segment.leadIds && segment.leadIds.length > 0) {
    // Usar IDs cacheados si están disponibles
    const allLeads = await getLeads(tenantId, {});
    return allLeads.filter((l) => segment.leadIds!.includes(l.id));
  } else {
    // Calcular dinámicamente
    await calculateSegmentLeads(tenantId, segmentId);
    const updatedSegment = (await db
      .collection('tenants')
      .doc(tenantId)
      .collection('segments')
      .doc(segmentId)
      .get()).data() as Segment;
    
    const allLeads = await getLeads(tenantId, {});
    return allLeads.filter((l) => updatedSegment.leadIds!.includes(l.id));
  }
}

/**
 * Elimina un segmento
 */
export async function deleteSegment(
  tenantId: string,
  segmentId: string
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('segments')
    .doc(segmentId)
    .delete();
}

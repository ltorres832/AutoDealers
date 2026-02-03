// Gestión de leads

import { Lead, LeadStatus, LeadSource } from './types';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

/**
 * Crea un nuevo lead
 */
export async function createLead(
  tenantId: string,
  source: LeadSource,
  contact: {
    name: string;
    email?: string;
    phone: string;
    preferredChannel: string;
  },
  notes?: string
): Promise<Lead> {
  const leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
    tenantId,
    source,
    status: 'new',
    contact,
    notes: notes || '',
    interactions: [],
  };

  const db = getDb();
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc();

  await docRef.set({
    ...leadData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  const newLead: Lead = {
    id: docRef.id,
    ...leadData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Clasificar automáticamente con IA si está habilitado (asíncrono, no bloquea)
  try {
    const { classifyLeadWithTenantConfig } = await import('@autodealers/ai');
    const classification = await classifyLeadWithTenantConfig(tenantId, {
      name: contact.name,
      phone: contact.phone,
      source,
      messages: notes ? [notes] : [],
    });

    if (classification) {
      await docRef.update({
        aiClassification: {
          priority: classification.priority,
          sentiment: classification.sentiment,
          intent: classification.intent,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
        },
      } as any);
      newLead.aiClassification = {
        priority: classification.priority,
        sentiment: classification.sentiment,
        intent: classification.intent,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
      } as any;
    }
  } catch (error) {
    // No fallar si la IA no está disponible
    console.warn('IA classification skipped for new lead:', error);
  }

  // Calcular score automático si está habilitado (asíncrono, no bloquea)
  try {
    const { calculateAutomaticScore, updateLeadScore } = await import('./scoring');
    const automaticScore = await calculateAutomaticScore(tenantId, newLead);
    if (automaticScore > 0) {
      await updateLeadScore(tenantId, newLead.id, automaticScore, undefined, 'Score calculado automáticamente al crear lead', 'system');
      newLead.score = {
        automatic: automaticScore,
        combined: automaticScore,
        lastUpdated: new Date(),
        history: [{
          score: automaticScore,
          type: 'automatic',
          reason: 'Score calculado automáticamente al crear lead',
          updatedBy: 'system',
          updatedAt: new Date(),
        }],
      };
    }
  } catch (error) {
    // No fallar si el scoring no está disponible
    console.warn('Scoring calculation skipped for new lead:', error);
  }

  // Notificar a gerentes y administradores sobre el nuevo lead (asíncrono, no bloquea)
  try {
    const { notifyManagersAndAdmins } = await import('@autodealers/core');
    await notifyManagersAndAdmins(tenantId, {
      type: 'lead_created',
      title: 'Nuevo Lead Creado',
      message: `Se ha creado un nuevo lead de ${contact.name} (${contact.phone}) desde ${source}. ${notes ? `Notas: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}` : ''}`,
      metadata: {
        leadId: newLead.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        source,
      },
    });
  } catch (error) {
    // No fallar si las notificaciones no están disponibles
    console.warn('Manager notification skipped for new lead:', error);
  }

  return newLead;
}

/**
 * Obtiene un lead por ID
 */
export async function getLeadById(
  tenantId: string,
  leadId: string
): Promise<Lead | null> {
  const db = getDb();
  const leadDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId)
    .get();

  if (!leadDoc.exists) {
    return null;
  }

  const data = leadDoc.data();
  return {
    id: leadDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as Lead;
}

/**
 * Obtiene leads por tenant con filtros
 */
export async function getLeads(
  tenantId: string,
  filters?: {
    status?: LeadStatus;
    assignedTo?: string;
    source?: LeadSource;
    limit?: number;
  }
): Promise<Lead[]> {
  const db = getDb();
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads');

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters?.assignedTo) {
    query = query.where('assignedTo', '==', filters.assignedTo);
  }

  if (filters?.source) {
    query = query.where('source', '==', filters.source);
  }

  query = query.orderBy('createdAt', 'desc');

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Lead;
  });
}

/**
 * Actualiza el estado de un lead
 */
export async function updateLeadStatus(
  tenantId: string,
  leadId: string,
  status: LeadStatus
): Promise<void> {
  const db = getDb();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId)
    .update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

/**
 * Asigna un lead a un vendedor
 */
export async function assignLead(
  tenantId: string,
  leadId: string,
  userId: string
): Promise<void> {
  const db = getDb();
  
  // Obtener información del lead antes de actualizar
  const leadDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId)
    .get();
  
  const leadData = leadDoc.data();
  
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId)
    .update({
      assignedTo: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

  // Obtener información del vendedor asignado
  const sellerDoc = await db.collection('users').doc(userId).get();
  const sellerName = sellerDoc.data()?.name || 'Vendedor';

  // Notificar a gerentes y administradores sobre la asignación (asíncrono, no bloquea)
  try {
    const { notifyManagersAndAdmins } = await import('@autodealers/core');
    await notifyManagersAndAdmins(tenantId, {
      type: 'lead_assigned',
      title: 'Lead Asignado',
      message: `El lead de ${leadData?.contact?.name || 'Cliente'} (${leadData?.contact?.phone || ''}) ha sido asignado a ${sellerName}.`,
      metadata: {
        leadId,
        assignedTo: userId,
        assignedToName: sellerName,
        contactName: leadData?.contact?.name,
        contactPhone: leadData?.contact?.phone,
      },
    });
  } catch (error) {
    // No fallar si las notificaciones no están disponibles
    console.warn('Manager notification skipped for lead assignment:', error);
  }
}

/**
 * Agrega una interacción a un lead
 */
export async function addInteraction(
  tenantId: string,
  leadId: string,
  interaction: {
    type: 'message' | 'call' | 'email' | 'note' | 'appointment';
    content: string;
    userId: string;
  }
): Promise<void> {
  const interactionData = {
    id: admin.firestore.FieldValue.serverTimestamp().toString(),
    ...interaction,
    createdAt: new Date(),
  };

  const db = getDb();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId)
    .update({
      interactions: admin.firestore.FieldValue.arrayUnion(interactionData),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

/**
 * Actualiza un lead
 */
export async function updateLead(
  tenantId: string,
  leadId: string,
  updates: Partial<Lead>
): Promise<void> {
  const db = getDb();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc(leadId)
    .update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}

/**
 * Busca un lead existente por teléfono (en cualquier tenant)
 * Útil para webhooks que no conocen el tenantId
 */
export async function findLeadByPhone(phone: string): Promise<Lead | null> {
  // Normalizar teléfono (remover espacios, guiones, etc)
  const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  const db = getDb();
  // Buscar en todos los tenants (esto puede ser costoso, pero necesario para webhooks)
  const tenantsSnapshot = await db.collection('tenants').get();
  
  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;
    const leadsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .where('contact.phone', '==', phone)
      .limit(1)
      .get();
    
    if (!leadsSnapshot.empty) {
      const leadDoc = leadsSnapshot.docs[0];
      const data = leadDoc.data();
      return {
        id: leadDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
      } as Lead;
    }
    
    // También buscar con teléfono normalizado
    const leadsSnapshotNormalized = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .where('contact.phone', '==', normalizedPhone)
      .limit(1)
      .get();
    
    if (!leadsSnapshotNormalized.empty) {
      const leadDoc = leadsSnapshotNormalized.docs[0];
      const data = leadDoc.data();
      return {
        id: leadDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
      } as Lead;
    }
  }
  
  return null;
}

/**
 * Busca un lead por teléfono en un tenant específico
 */
export async function findLeadByPhoneInTenant(
  tenantId: string,
  phone: string
): Promise<Lead | null> {
  const db = getDb();
  const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Buscar con teléfono original
  let snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .where('contact.phone', '==', phone)
    .limit(1)
    .get();
  
  if (snapshot.empty && normalizedPhone !== phone) {
    // Buscar con teléfono normalizado
    snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('leads')
      .where('contact.phone', '==', normalizedPhone)
      .limit(1)
      .get();
  }
  
  if (snapshot.empty) {
    return null;
  }
  
  const leadDoc = snapshot.docs[0];
  const data = leadDoc.data();
  return {
    id: leadDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as Lead;
}


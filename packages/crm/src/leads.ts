// Gestión de leads

import { Lead, LeadStatus, LeadSource } from './types';
import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

/** Campos opcionales al crear (admin, importaciones, etc.) — todo en `tenants/{tenantId}/leads`. */
export interface CreateLeadExtras {
  assignedTo?: string | null;
  createdBy?: string;
  createdByAdmin?: boolean;
  vehicleInterest?: string | null;
  vehicleId?: string;
  vehicleStockNumber?: string;
  vehicleStockSnapshot?: import('@autodealers/inventory').VehicleStockSnapshot;
  publicTrackingToken?: string;
  budget?: string | number | null;
  lastContactDate?: Date | null;
  nextFollowUpDate?: Date | null;
  tradeIn?: import('./finance-insurance').TradeInVehicleProfile;
  leadFormResponses?: Record<string, string>;
  metaLeadGenId?: string;
  metaFormId?: string;
  metaAdId?: string;
  /** Normaliza email, ciudad y vehicleInterest (strings, pueden ser vacíos) */
  populateStandardContactFields?: boolean;
  /** Etiquetas CRM (p. ej. origen catálogo web). */
  tags?: string[];
  /** Estado inicial (por defecto `new`). Ej. `lost` para prospectos muy fríos si el negocio lo desea. */
  initialStatus?: LeadStatus;
  /**
   * Lead del vendedor (publicidad/redes/formulario propio). Va directo a `assignedTo` y
   * no aparece en el CRM general del concesionario.
   */
  sellerOwned?: boolean;
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
    city?: string;
  },
  notes?: string,
  extras?: CreateLeadExtras
): Promise<Lead> {
  const assignedToFromExtras =
    typeof extras?.assignedTo === 'string' && extras.assignedTo.trim()
      ? extras.assignedTo.trim()
      : undefined;

  let assignedTo = assignedToFromExtras;
  const sellerOwned = extras?.sellerOwned === true;

  if (sellerOwned) {
    assignedTo = assignedToFromExtras || (typeof extras?.createdBy === 'string' ? extras.createdBy.trim() : undefined);
  } else if (!assignedTo) {
    try {
      const { pickNextAssignedSellerForNewLead } = await import('./lead-routing');
      const auto = await pickNextAssignedSellerForNewLead(tenantId, source);
      if (auto) {
        assignedTo = auto;
      }
    } catch (error) {
      console.warn('[crm] lead routing skipped:', error);
    }
  }
  if (!sellerOwned && !assignedTo) {
    try {
      const { getUsersByTenant } = await import('@autodealers/core');
      const users = await getUsersByTenant(tenantId);
      const activeSellers = users.filter((u) => {
        if (u.role !== 'seller') return false;
        const st = (u as { status?: string }).status;
        return st === undefined || st === 'active' || st === 'pending';
      });
      if (activeSellers.length === 1) {
        assignedTo = activeSellers[0].id;
      }
    } catch (error) {
      console.warn('[crm] single-seller fallback skipped:', error);
    }
  }

  const fillStandard = extras?.populateStandardContactFields === true;
  const contactResolved = fillStandard
    ? {
        name: contact.name,
        phone: contact.phone,
        preferredChannel: contact.preferredChannel,
        email: contact.email ?? '',
        city: contact.city ?? '',
      }
    : {
        name: contact.name,
        phone: contact.phone,
        preferredChannel: contact.preferredChannel,
        ...(contact.email !== undefined && contact.email !== '' ? { email: contact.email } : {}),
        ...(contact.city !== undefined && contact.city !== '' ? { city: contact.city } : {}),
      };

  const vehicleInterestForDoc = fillStandard
    ? String(extras?.vehicleInterest ?? '').trim()
    : extras?.vehicleInterest != null && String(extras.vehicleInterest).trim() !== ''
      ? String(extras.vehicleInterest).trim()
      : undefined;

  const ST: LeadStatus[] = [
    'new',
    'contacted',
    'qualified',
    'pre_qualified',
    'appointment',
    'test_drive',
    'negotiation',
    'closed',
    'lost',
  ];
  const initialStatus: LeadStatus =
    extras?.initialStatus && ST.includes(extras.initialStatus) ? extras.initialStatus : 'new';

  const leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
    tenantId,
    source,
    status: initialStatus,
    contact: contactResolved as Lead['contact'],
    notes: notes || '',
    interactions: [],
    ...(assignedTo ? { assignedTo } : {}),
    ...(extras?.createdBy ? { createdBy: extras.createdBy } : {}),
    ...(extras?.createdByAdmin ? { createdByAdmin: true } : {}),
    ...(vehicleInterestForDoc !== undefined ? { vehicleInterest: vehicleInterestForDoc } : {}),
    ...(extras?.vehicleId && String(extras.vehicleId).trim() !== ''
      ? { vehicleId: String(extras.vehicleId).trim() }
      : {}),
    ...(extras?.vehicleStockNumber && String(extras.vehicleStockNumber).trim() !== ''
      ? { vehicleStockNumber: String(extras.vehicleStockNumber).trim() }
      : {}),
    ...(extras?.vehicleStockSnapshot ? { vehicleStockSnapshot: extras.vehicleStockSnapshot } : {}),
    ...(extras?.publicTrackingToken && String(extras.publicTrackingToken).trim() !== ''
      ? { publicTrackingToken: String(extras.publicTrackingToken).trim() }
      : {}),
    ...(extras?.budget != null && String(extras.budget).trim() !== ''
      ? { budget: extras.budget }
      : {}),
    ...(extras?.tradeIn && Object.keys(extras.tradeIn).length > 0 ? { tradeIn: extras.tradeIn } : {}),
    ...(extras?.lastContactDate !== undefined
      ? { lastContactDate: extras.lastContactDate }
      : {}),
    ...(extras?.nextFollowUpDate !== undefined
      ? { nextFollowUpDate: extras.nextFollowUpDate }
      : {}),
    ...(extras?.leadFormResponses && Object.keys(extras.leadFormResponses).length > 0
      ? { leadFormResponses: extras.leadFormResponses }
      : {}),
    ...(extras?.metaLeadGenId && String(extras.metaLeadGenId).trim() !== ''
      ? { metaLeadGenId: String(extras.metaLeadGenId).trim() }
      : {}),
    ...(extras?.metaFormId && String(extras.metaFormId).trim() !== ''
      ? { metaFormId: String(extras.metaFormId).trim() }
      : {}),
    ...(extras?.metaAdId && String(extras.metaAdId).trim() !== ''
      ? { metaAdId: String(extras.metaAdId).trim() }
      : {}),
    ...(Array.isArray(extras?.tags) && extras.tags.length > 0
      ? { tags: extras.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 24) }
      : {}),
    ...(sellerOwned ? { sellerOwned: true } : {}),
  };

  const db = getDb();
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .doc();

  await docRef.set({
    ...leadData,
    createdAt: getFirestoreFieldValue().serverTimestamp(),
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
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

  // Notificar a gerentes / dealers sobre el nuevo lead (asíncrono, no bloquea)
  try {
    const { notifyManagersAndAdmins } = await import('@autodealers/core');
    await notifyManagersAndAdmins(
      tenantId,
      {
        type: 'lead_created',
        title: 'Nuevo Lead Creado',
        message: `Se ha creado un nuevo lead de ${contact.name} (${contact.phone}) desde ${source}. ${notes ? `Notas: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}` : ''}`,
        metadata: {
          leadId: newLead.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          source,
        },
      },
      assignedTo ? { excludeUserIds: [assignedTo] } : undefined
    );
  } catch (error) {
    // No fallar si las notificaciones no están disponibles
    console.warn('Manager notification skipped for new lead:', error);
  }

  // Notificar al vendedor asignado (incl. email / SMS / WhatsApp según preferencias)
  if (assignedTo) {
    try {
      const { notifyUser } = await import('@autodealers/core');
      await notifyUser(tenantId, assignedTo, {
        type: extras?.tags?.includes('catalogo_web') ? 'catalog_interest' : 'lead_created',
        title: extras?.tags?.includes('catalogo_web')
          ? 'Interés en vehículo (web)'
          : 'Nuevo lead asignado a ti',
        message: extras?.tags?.includes('catalogo_web')
          ? `${contact.name} (${contact.phone}) dejó sus datos en la ficha de un vehículo. Revisa Leads para dar seguimiento.`
          : `Lead de ${contact.name} (${contact.phone}) — origen: ${source}. ${notes ? `Notas: ${notes.substring(0, 200)}${notes.length > 200 ? '…' : ''}` : ''}`,
        metadata: {
          leadId: newLead.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          source,
          route: `/leads?leadId=${newLead.id}`,
        },
      });
    } catch (error) {
      console.warn('Assigned seller notification skipped for new lead:', error);
    }
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
    /** Excluir leads del vendedor (CRM del concesionario). */
    dealerVisibleOnly?: boolean;
  }
): Promise<Lead[]> {
  const db = getDb();
  let query: any = db
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

  let rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Lead;
  });

  if (filters?.dealerVisibleOnly) {
    const { filterDealerVisibleLeads } = await import('./seller-owned-leads');
    rows = filterDealerVisibleLeads(rows);
  }

  return rows;
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
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
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
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    } as any);

  // Obtener información del vendedor asignado
  const sellerDoc = await db.collection('users').doc(userId).get();
  const sellerName = sellerDoc.data()?.name || 'Vendedor';

  const contactLabel = `${leadData?.contact?.name || 'Cliente'} (${leadData?.contact?.phone || ''})`;

  // Notificar al vendedor asignado
  try {
    const { notifyUser } = await import('@autodealers/core');
    await notifyUser(tenantId, userId, {
      type: 'lead_assigned',
      title: 'Lead asignado a ti',
      message: `Te asignaron el lead de ${contactLabel}.`,
      metadata: {
        leadId,
        route: `/leads?leadId=${leadId}`,
        contactName: leadData?.contact?.name,
        contactPhone: leadData?.contact?.phone,
      },
    });
  } catch (error) {
    console.warn('Seller notification skipped for lead assignment:', error);
  }

  // Notificar a gerentes y administradores sobre la asignación
  try {
    const { notifyManagersAndAdmins } = await import('@autodealers/core');
    await notifyManagersAndAdmins(
      tenantId,
      {
        type: 'lead_assigned',
        title: 'Lead Asignado',
        message: `El lead de ${contactLabel} ha sido asignado a ${sellerName}.`,
        metadata: {
          leadId,
          assignedTo: userId,
          assignedToName: sellerName,
          route: `/leads?leadId=${leadId}`,
          contactName: leadData?.contact?.name,
          contactPhone: leadData?.contact?.phone,
        },
      },
      { excludeUserIds: [userId] }
    );
  } catch (error) {
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
    id: getFirestoreFieldValue().serverTimestamp().toString(),
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
      interactions: getFirestoreFieldValue().arrayUnion(interactionData),
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
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
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    } as any);
}

/**
 * Elimina un lead del tenant (borrado permanente).
 */
export async function deleteLead(tenantId: string, leadId: string): Promise<void> {
  const db = getDb();
  const ref = db.collection('tenants').doc(tenantId).collection('leads').doc(leadId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Lead not found');
  }
  await ref.delete();
}

/**
 * Busca lead ya importado desde el mismo Meta Leadgen ID (dedupe).
 */
export async function findLeadByMetaLeadGenId(
  tenantId: string,
  metaLeadGenId: string
): Promise<Lead | null> {
  const id = String(metaLeadGenId || '').trim();
  if (!id) return null;
  const db = getDb();
  const snap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .where('metaLeadGenId', '==', id)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const leadDoc = snap.docs[0];
  const data = leadDoc.data();
  return {
    id: leadDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  } as Lead;
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


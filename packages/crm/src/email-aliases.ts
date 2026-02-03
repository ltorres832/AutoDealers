// Gestión de Aliases de Email (según documento final)

import { EmailAlias, Dealer, EmailAliasUsage, EmailAliasStatus } from '@autodealers/core';
import { ZohoMailService } from '@autodealers/messaging';
import { getFirestore, getUserById, getTenantById } from '@autodealers/core';
import { getMembershipById } from '@autodealers/billing';
import * as admin from 'firebase-admin';

const db = getFirestore();

// Dominio base para emails corporativos
const CORPORATE_EMAIL_DOMAIN = process.env.CORPORATE_EMAIL_DOMAIN || 'autodealers.com';

/**
 * Obtiene el dominio de email para un dealer
 */
async function getDealerEmailDomain(dealerSubdomain?: string): Promise<string> {
  // Obtener dominio desde credenciales de Zoho Mail
  const { getZohoMailCredentials } = await import('@autodealers/core');
  const credentials = await getZohoMailCredentials();
  const baseDomain = credentials.domain || CORPORATE_EMAIL_DOMAIN;
  
  if (dealerSubdomain) {
    return `${dealerSubdomain}.${baseDomain}`;
  }
  return baseDomain;
}

/**
 * Obtiene el servicio Zoho Mail configurado
 */
async function getZohoMailService(): Promise<ZohoMailService | null> {
  // Intentar obtener credenciales desde Firestore primero
  const { getZohoMailCredentials } = await import('@autodealers/core');
  const credentials = await getZohoMailCredentials();

  const clientId = credentials.clientId;
  const clientSecret = credentials.clientSecret;
  const refreshToken = credentials.refreshToken;
  const organizationId = credentials.organizationId;
  const domain = credentials.domain || 'autodealers.com';

  if (!clientId || !clientSecret || !refreshToken || !organizationId) {
    console.warn('Zoho Mail credentials not configured');
    return null;
  }

  return new ZohoMailService(
    clientId,
    clientSecret,
    refreshToken,
    domain,
    organizationId
  );
}

/**
 * Verifica si un dealer puede crear un alias según su membresía
 */
async function canCreateAlias(dealerId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number | null;
  used?: number;
}> {
  try {
    const dealerDoc = await db.collection('dealers').doc(dealerId).get();
    if (!dealerDoc.exists) {
      return { allowed: false, reason: 'Dealer no encontrado' };
    }

    const dealer = dealerDoc.data() as Dealer;

    // Verificar que esté aprobado por admin
    if (!dealer.approvedByAdmin) {
      return { allowed: false, reason: 'Dealer no ha sido aprobado por admin' };
    }

    // Verificar límite
    const limit = dealer.aliasesLimit ?? null;
    const used = dealer.aliasesUsed || 0;

    // Si el límite es null, es ilimitado
    if (limit === null) {
      return { allowed: true, limit: null, used };
    }

    // Verificar si ha alcanzado el límite
    if (used >= limit) {
      return {
        allowed: false,
        limit,
        used,
        reason: `Has alcanzado el límite de ${limit} alias(es)`,
      };
    }

    return { allowed: true, limit, used };
  } catch (error) {
    console.error('Error checking alias limit:', error);
    return { allowed: false, reason: 'Error al verificar límite de aliases' };
  }
}

/**
 * Crea un nuevo alias de email
 */
export async function createEmailAlias(
  dealerId: string,
  alias: string, // Parte antes del @ (ej: "ventas")
  assignedTo: string // UID del usuario asignado
): Promise<EmailAlias> {
  try {
    // Verificar permisos
    const canCreate = await canCreateAlias(dealerId);
    if (!canCreate.allowed) {
      throw new Error(canCreate.reason || 'No puedes crear este alias');
    }

    // Obtener información del dealer
    const dealerDoc = await db.collection('dealers').doc(dealerId).get();
    if (!dealerDoc.exists) {
      throw new Error('Dealer no encontrado');
    }

    const dealer = dealerDoc.data() as Dealer;

    // Verificar que el usuario asignado existe
    const user = await getUserById(assignedTo);
    if (!user) {
      throw new Error('Usuario asignado no encontrado');
    }

    // Generar email completo
    const dealerDomain = await getDealerEmailDomain(dealer.subdomain);
    const fullEmail = `${alias}@${dealerDomain}`;

    // Verificar que el alias no exista
    const existingAliasSnapshot = await db
      .collection('email_aliases')
      .where('fullEmail', '==', fullEmail)
      .where('status', '!=', 'deleted')
      .get();

    if (!existingAliasSnapshot.empty) {
      throw new Error('Este alias ya existe');
    }

    // Crear alias en Zoho Mail
    const zohoService = await getZohoMailService();
    let zohoAliasId: string | undefined;

    if (zohoService) {
      // Primero necesitamos el email principal del dealer para crear el alias
      // Por ahora, creamos el alias directamente
      // TODO: En Zoho, necesitamos asociar el alias a un email principal
      // Por simplicidad, asumimos que el dealer tiene un email principal configurado
      
      // Intentar crear alias en Zoho
      // Nota: La API de Zoho para crear aliases requiere el emailId principal
      // Por ahora, solo guardamos en Firestore
    }

    // Crear registro en Firestore
    const aliasRef = db.collection('email_aliases').doc();

    const aliasData: Omit<EmailAlias, 'id'> = {
      alias,
      fullEmail,
      dealerId,
      assignedTo,
      active: true,
      status: 'active',
      zohoAliasId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await aliasRef.set({
      ...aliasData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    // Actualizar contador de aliases usados en dealer
    await db.collection('dealers').doc(dealerId).update({
      aliasesUsed: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      id: aliasRef.id,
      ...aliasData,
    };
  } catch (error) {
    throw new Error(`Error creating email alias: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Obtiene los aliases de un dealer
 */
export async function getEmailAliases(dealerId?: string, assignedTo?: string): Promise<EmailAlias[]> {
  try {
    let query: admin.firestore.Query;

    if (dealerId) {
      query = db
        .collection('email_aliases')
        .where('dealerId', '==', dealerId)
        .where('status', '!=', 'deleted')
        .orderBy('createdAt', 'desc');
    } else if (assignedTo) {
      query = db
        .collection('email_aliases')
        .where('assignedTo', '==', assignedTo)
        .where('status', '!=', 'deleted')
        .orderBy('createdAt', 'desc');
    } else {
      // Obtener todos los aliases activos
      query = db
        .collection('email_aliases')
        .where('status', '!=', 'deleted')
        .orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        suspendedAt: data.suspendedAt?.toDate(),
        reactivatedAt: data.reactivatedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as EmailAlias;
    });
  } catch (error) {
    console.error('Error getting email aliases:', error);
    return [];
  }
}

/**
 * Obtiene un dealer por ID
 */
export async function getDealerById(dealerId: string): Promise<Dealer | null> {
  try {
    const dealerDoc = await db.collection('dealers').doc(dealerId).get();
    if (!dealerDoc.exists) {
      return null;
    }

    const data = dealerDoc.data();
    return {
      dealerId: dealerDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      approvedAt: data?.approvedAt?.toDate(),
    } as Dealer;
  } catch (error) {
    console.error('Error getting dealer:', error);
    return null;
  }
}

/**
 * Obtiene todos los dealers
 */
export async function getAllDealers(filter?: {
  status?: 'active' | 'suspended' | 'cancelled' | 'pending';
  approvedByAdmin?: boolean;
}): Promise<Dealer[]> {
  try {
    let query: admin.firestore.Query = db.collection('dealers');

    if (filter?.status) {
      query = query.where('status', '==', filter.status) as admin.firestore.Query;
    }

    if (filter?.approvedByAdmin !== undefined) {
      query = query.where('approvedByAdmin', '==', filter.approvedByAdmin) as admin.firestore.Query;
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        dealerId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        approvedAt: data.approvedAt?.toDate(),
      } as Dealer;
    });
  } catch (error) {
    console.error('Error getting dealers:', error);
    return [];
  }
}

/**
 * Aprueba un dealer (admin)
 */
export async function approveDealer(
  dealerId: string,
  approvedBy: string, // UID del admin
  aliasesLimit?: number | null // Límite de aliases según membresía
): Promise<void> {
  try {
    const dealerDoc = await db.collection('dealers').doc(dealerId);
    const dealerData = await dealerDoc.get();

    if (!dealerData.exists) {
      throw new Error('Dealer no encontrado');
    }

    const dealer = dealerData.data() as Dealer;

    // Obtener membresía para determinar límite de aliases
    let limit = aliasesLimit;
    if (!limit && dealer.membresia) {
      const membership = await getMembershipById(dealer.membresia);
      if (membership) {
        // Mapear membresía a límite de aliases
        // Básica: 1, Avanzada: 3, Pro: null (ilimitado)
        if (membership.name.toLowerCase().includes('básico') || membership.name.toLowerCase().includes('basic')) {
          limit = 1;
        } else if (membership.name.toLowerCase().includes('avanzado') || membership.name.toLowerCase().includes('advanced')) {
          limit = 3;
        } else if (membership.name.toLowerCase().includes('pro') || membership.name.toLowerCase().includes('enterprise')) {
          limit = null; // Ilimitado
        } else if (membership.name.toLowerCase().includes('multi_dealer')) {
          // Multi Dealer 1: 5, Multi Dealer 2: 10, Multi Dealer 3: null (ilimitado)
          const match = membership.name.match(/multi[_\s]?dealer[_\s]?(\d)/i);
          if (match) {
            const num = parseInt(match[1]);
            if (num === 1) limit = 5;
            else if (num === 2) limit = 10;
            else if (num === 3) limit = null;
          }
        }
      }
    }

    // Actualizar dealer
    await dealerDoc.update({
      approvedByAdmin: true,
      status: 'active',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy,
      aliasesLimit: limit ?? null,
      emailAliases: limit ?? null, // Para compatibilidad con User interface
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Trigger: Crear aliases iniciales según membresía (si aplica)
    // Por ahora, solo se aprueba. Los aliases se crean manualmente o por trigger externo
    console.log(`✅ Dealer ${dealerId} aprobado por admin ${approvedBy}`);
  } catch (error) {
    throw new Error(`Error approving dealer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Rechaza o suspende un dealer
 */
export async function rejectDealer(dealerId: string, reason?: string): Promise<void> {
  try {
    await db.collection('dealers').doc(dealerId).update({
      approvedByAdmin: false,
      status: 'suspended',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: reason,
    });

    // Suspender todos los aliases del dealer
    const aliases = await getEmailAliases(dealerId);
    for (const alias of aliases) {
      await suspendEmailAlias(alias.id);
    }
  } catch (error) {
    throw new Error(`Error rejecting dealer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Suspende un alias de email
 */
export async function suspendEmailAlias(aliasId: string): Promise<void> {
  try {
    const aliasRef = db.collection('email_aliases').doc(aliasId);
    const aliasDoc = await aliasRef.get();

    if (!aliasDoc.exists) {
      throw new Error('Alias no encontrado');
    }

    const aliasData = aliasDoc.data() as EmailAlias;

    // Suspender en Zoho si tiene ID
    if (aliasData.zohoAliasId) {
      const zohoService = await getZohoMailService();
      if (zohoService) {
        // Nota: Zoho no tiene API directa para suspender aliases
        // Por ahora, solo actualizamos en Firestore
      }
    }

    // Actualizar en Firestore
    await aliasRef.update({
      active: false,
      status: 'suspended',
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Decrementar contador en dealer
    await db.collection('dealers').doc(aliasData.dealerId).update({
      aliasesUsed: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    throw new Error(`Error suspending email alias: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reactiva un alias de email
 */
export async function activateEmailAlias(aliasId: string): Promise<void> {
  try {
    const aliasRef = db.collection('email_aliases').doc(aliasId);
    const aliasDoc = await aliasRef.get();

    if (!aliasDoc.exists) {
      throw new Error('Alias no encontrado');
    }

    const aliasData = aliasDoc.data() as EmailAlias;

    // Verificar límite antes de reactivar
    const canCreate = await canCreateAlias(aliasData.dealerId);
    if (!canCreate.allowed) {
      throw new Error(canCreate.reason || 'No puedes reactivar este alias (límite alcanzado)');
    }

    // Actualizar en Firestore
    await aliasRef.update({
      active: true,
      status: 'active',
      reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      suspendedAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Incrementar contador en dealer
    await db.collection('dealers').doc(aliasData.dealerId).update({
      aliasesUsed: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    throw new Error(`Error activating email alias: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Elimina un alias de email
 */
export async function deleteEmailAlias(aliasId: string): Promise<void> {
  try {
    const aliasRef = db.collection('email_aliases').doc(aliasId);
    const aliasDoc = await aliasRef.get();

    if (!aliasDoc.exists) {
      throw new Error('Alias no encontrado');
    }

    const aliasData = aliasDoc.data() as EmailAlias;

    // Marcar como eliminado (soft delete)
    await aliasRef.update({
      active: false,
      status: 'deleted',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Decrementar contador en dealer solo si estaba activo
    if (aliasData.active) {
      await db.collection('dealers').doc(aliasData.dealerId).update({
        aliasesUsed: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    throw new Error(`Error deleting email alias: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Obtiene el uso de aliases para un dealer
 */
export async function getEmailAliasUsage(dealerId: string): Promise<EmailAliasUsage> {
  try {
    const dealer = await getDealerById(dealerId);
    if (!dealer) {
      throw new Error('Dealer no encontrado');
    }

    return {
      dealerId,
      aliasesUsed: dealer.aliasesUsed || 0,
      aliasesLimit: dealer.aliasesLimit ?? null,
    };
  } catch (error) {
    console.error('Error getting alias usage:', error);
    return {
      dealerId,
      aliasesUsed: 0,
      aliasesLimit: null,
    };
  }
}

/**
 * Ajusta aliases automáticamente al cambiar membresía (upgrade/downgrade)
 */
export async function adjustAliasesOnMembershipChange(
  dealerId: string,
  newMembershipId: string
): Promise<{
  suspended: string[]; // IDs de aliases suspendidos
  allowed: number;
}> {
  try {
    const dealer = await getDealerById(dealerId);
    if (!dealer) {
      throw new Error('Dealer no encontrado');
    }

    // Obtener nueva membresía
    const newMembership = await getMembershipById(newMembershipId);
    if (!newMembership) {
      throw new Error('Membresía no encontrada');
    }

    // Determinar nuevo límite
    let newLimit: number | null = null;
    if (newMembership.name.toLowerCase().includes('básico') || newMembership.name.toLowerCase().includes('basic')) {
      newLimit = 1;
    } else if (newMembership.name.toLowerCase().includes('avanzado') || newMembership.name.toLowerCase().includes('advanced')) {
      newLimit = 3;
    } else if (newMembership.name.toLowerCase().includes('pro') || newMembership.name.toLowerCase().includes('enterprise')) {
      newLimit = null; // Ilimitado
    } else if (newMembership.name.toLowerCase().includes('multi_dealer')) {
      const match = newMembership.name.match(/multi[_\s]?dealer[_\s]?(\d)/i);
      if (match) {
        const num = parseInt(match[1]);
        if (num === 1) newLimit = 5;
        else if (num === 2) newLimit = 10;
        else if (num === 3) newLimit = null;
      }
    }

    // Actualizar límite en dealer
    await db.collection('dealers').doc(dealerId).update({
      aliasesLimit: newLimit,
      membresia: newMembershipId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Si hay un límite y se excede, suspender excedentes
    const currentAliases = await getEmailAliases(dealerId);
    const activeAliases = currentAliases.filter((a) => a.active && a.status === 'active');
    const suspendedIds: string[] = [];

    if (newLimit !== null && activeAliases.length > newLimit) {
      // Ordenar por fecha de creación (más antiguos primero para mantener los más recientes)
      activeAliases.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // Suspender los excedentes
      const toSuspend = activeAliases.slice(newLimit);
      for (const alias of toSuspend) {
        await suspendEmailAlias(alias.id);
        suspendedIds.push(alias.id);
      }
    }

    return {
      suspended: suspendedIds,
      allowed: newLimit ?? activeAliases.length,
    };
  } catch (error) {
    throw new Error(`Error adjusting aliases: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


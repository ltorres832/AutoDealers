// Sistema de usuarios subordinados (personas asignadas por dealers/vendedores)

import { getFirestore, getAuth } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import { createUser } from './users';
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

export interface SubUser {
  id: string;
  tenantId: string;
  createdBy: string; // ID del dealer/vendedor que lo creó
  email: string;
  name: string;
  phone?: string; // Número de teléfono para notificaciones SMS y WhatsApp
  role: 'manager' | 'assistant' | 'viewer';
  permissions: {
    canManageLeads: boolean;
    canManageInventory: boolean;
    canManageCampaigns: boolean;
    canManageMessages: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
  };
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea un usuario subordinado
 * Si createOwnTenant es true, crea un tenant propio con subdominio
 */
export async function createSubUser(
  tenantId: string,
  createdBy: string,
  subUserData: {
    email: string;
    password: string;
    name: string;
    phone?: string; // Número de teléfono para notificaciones SMS y WhatsApp
    role: SubUser['role'];
    permissions: Partial<SubUser['permissions']>;
    createOwnTenant?: boolean;
    subdomain?: string;
  }
): Promise<SubUser> {
  let finalTenantId = tenantId;
  let sellerTenantId: string | undefined;

  // Obtener membershipId del dealer para asignarlo al vendedor
  const dealerTenantDoc = await getDb().collection('tenants').doc(tenantId).get();
  const dealerMembershipId = dealerTenantDoc.data()?.membershipId || '';

  // Si se solicita crear tenant propio
  if (subUserData.createOwnTenant && subUserData.subdomain) {
    try {
      // Validar que el subdominio no esté en uso
      const { getTenantBySubdomain, createTenant } = await import('./tenants');
      const existing = await getTenantBySubdomain(subUserData.subdomain);
      if (existing) {
        throw new Error('El subdominio ya está en uso');
      }

      const sellerTenant = await createTenant(
        `${subUserData.name} - Vendedor`,
        'seller',
        subUserData.subdomain,
        dealerMembershipId // Usar la misma membresía del dealer
      );
      sellerTenantId = sellerTenant.id;
      finalTenantId = sellerTenant.id;
    } catch (error) {
      console.error('Error creating tenant for seller:', error);
      throw new Error(`Error al crear tenant: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Crear usuario en Firebase Auth
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: subUserData.email,
      password: subUserData.password,
      displayName: subUserData.name,
    });
  } catch (error) {
    console.error('Error creating user in Firebase Auth:', error);
    // Si hay un error, limpiar el tenant creado si existe
    if (sellerTenantId) {
      try {
        await getDb().collection('tenants').doc(sellerTenantId).delete();
      } catch (deleteError) {
        console.error('Error deleting tenant after auth failure:', deleteError);
      }
    }
    throw new Error(`Error al crear usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }

  // Establecer custom claims después de crear el usuario
  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'seller', // Rol base
    tenantId: finalTenantId,
    dealerId: subUserData.createOwnTenant ? tenantId : undefined,
    createdBy,
    isSubUser: !subUserData.createOwnTenant, // Solo es sub-user si no tiene tenant propio
    sellerTenantId: sellerTenantId,
  });

  // Permisos por defecto según rol
  // Si es vendedor con tenant propio, siempre usar permisos de 'assistant'
  const roleForPermissions = subUserData.createOwnTenant ? 'assistant' : subUserData.role;
  
  const defaultPermissions: Record<SubUser['role'], SubUser['permissions']> = {
    manager: {
      canManageLeads: true,
      canManageInventory: true,
      canManageCampaigns: true,
      canManageMessages: true,
      canViewReports: true,
      canManageSettings: false,
    },
    assistant: {
      canManageLeads: true,
      canManageInventory: false,
      canManageCampaigns: false,
      canManageMessages: true,
      canViewReports: true,
      canManageSettings: false,
    },
    viewer: {
      canManageLeads: false,
      canManageInventory: false,
      canManageCampaigns: false,
      canManageMessages: false,
      canViewReports: true,
      canManageSettings: false,
    },
  };

  const permissions = {
    ...defaultPermissions[roleForPermissions],
    ...subUserData.permissions,
  };

  // Crear documento en Firestore
  // Si es vendedor con tenant propio, usar role 'assistant', sino usar el role especificado
  const finalRole = subUserData.createOwnTenant ? 'assistant' : subUserData.role;
  
  const subUser: Omit<SubUser, 'id' | 'createdAt' | 'updatedAt'> = {
    tenantId: finalTenantId,
    createdBy,
    email: subUserData.email,
    name: subUserData.name,
    phone: subUserData.phone,
    role: finalRole,
    permissions,
    isActive: true,
  };

  // Crear usuario en la colección users (requerido para el sistema)
  // Usar el userRecord que ya creamos arriba para evitar duplicados
  try {
    const userData: any = {
      email: subUserData.email,
      name: subUserData.name,
      phone: subUserData.phone,
      role: 'seller',
      tenantId: finalTenantId,
      membershipId: dealerMembershipId, // Usar la misma membresía del dealer
      membershipType: 'seller',
      status: 'active',
      settings: {},
    };

    // Solo agregar dealerId si tiene valor
    if (subUserData.createOwnTenant && tenantId) {
      userData.dealerId = tenantId;
    }

    await getDb().collection('users').doc(userRecord.uid).set({
      ...userData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating user document in Firestore:', error);
    // Limpiar: eliminar usuario de Auth y tenant si existe
    try {
      await auth.deleteUser(userRecord.uid);
    } catch (deleteError) {
      console.error('Error deleting user from Auth:', deleteError);
    }
    if (sellerTenantId) {
      try {
        await getDb().collection('tenants').doc(sellerTenantId).delete();
      } catch (deleteError) {
        console.error('Error deleting tenant:', deleteError);
      }
    }
    throw new Error(`Error al guardar usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }

  // Si tiene tenant propio, guardar en la colección principal de sub_users
  // Si no, guardar en la subcolección del dealer
  let docRef;
  if (subUserData.createOwnTenant && sellerTenantId) {
    // Guardar en colección global de sub_users con referencia al dealer
    docRef = getDb().collection('sub_users').doc(userRecord.uid);
    await docRef.set({
      ...subUser,
      dealerTenantId: tenantId, // Referencia al tenant del dealer
      sellerTenantId: sellerTenantId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
  } else {
    // Guardar en subcolección del dealer (comportamiento original)
    docRef = getDb().collection('tenants')
      .doc(tenantId)
      .collection('sub_users')
      .doc(userRecord.uid);
    await docRef.set({
      ...subUser,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
  }

  return {
    id: userRecord.uid,
    ...subUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene usuarios subordinados de un tenant
 */
export async function getSubUsers(
  tenantId: string,
  createdBy?: string
): Promise<SubUser[]> {
  try {
    let query: admin.firestore.Query = getDb().collection('tenants')
      .doc(tenantId)
      .collection('sub_users');

    // Si hay createdBy, intentar filtrar primero sin orderBy para evitar necesidad de índice
    if (createdBy) {
      query = query.where('createdBy', '==', createdBy);
      // Intentar obtener sin orderBy primero (evita necesidad de índice compuesto)
      const snapshot = await query.get();
      const results = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastLogin: data?.lastLogin?.toDate(),
          createdAt: data?.createdAt?.toDate() || new Date(),
          updatedAt: data?.updatedAt?.toDate() || new Date(),
        } as SubUser;
      });
      // Ordenar en memoria
      return results.sort((a, b) => {
        const aTime = a.createdAt.getTime();
        const bTime = b.createdAt.getTime();
        return bTime - aTime; // Descendente
      });
    } else {
      // Si no hay filtro createdBy, podemos usar orderBy
      query = query.orderBy('createdAt', 'desc');
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastLogin: data?.lastLogin?.toDate(),
          createdAt: data?.createdAt?.toDate() || new Date(),
          updatedAt: data?.updatedAt?.toDate() || new Date(),
        } as SubUser;
      });
    }
  } catch (error: any) {
    // Si falla por falta de índice, intentar sin orderBy
    if (error.code === 9 || error.message?.includes('index')) {
      console.warn('⚠️ [getSubUsers] Índice faltante, obteniendo sin orderBy:', error.message);
      try {
        let query: admin.firestore.Query = getDb().collection('tenants')
          .doc(tenantId)
          .collection('sub_users');
        
        if (createdBy) {
          query = query.where('createdBy', '==', createdBy);
        }
        
        const snapshot = await query.get();
        const results = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            lastLogin: data?.lastLogin?.toDate(),
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
          } as SubUser;
        });
        // Ordenar en memoria
        return results.sort((a, b) => {
          const aTime = a.createdAt.getTime();
          const bTime = b.createdAt.getTime();
          return bTime - aTime; // Descendente
        });
      } catch (fallbackError) {
        console.error('Error en fallback de getSubUsers:', fallbackError);
        return [];
      }
    }
    throw error;
  }
}

/**
 * Activa/desactiva un usuario subordinado
 */
export async function toggleSubUserStatus(
  tenantId: string,
  subUserId: string,
  isActive: boolean
): Promise<void> {
  await getDb().collection('tenants')
    .doc(tenantId)
    .collection('sub_users')
    .doc(subUserId)
    .update({
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

  // También actualizar en Firebase Auth
  await auth.updateUser(subUserId, { disabled: !isActive });
}

/**
 * Actualiza permisos de un usuario subordinado
 */
export async function updateSubUserPermissions(
  tenantId: string,
  subUserId: string,
  permissions: Partial<SubUser['permissions']>
): Promise<void> {
  const subUserDoc = await getDb().collection('tenants')
    .doc(tenantId)
    .collection('sub_users')
    .doc(subUserId)
    .get();

  if (!subUserDoc.exists) {
    throw new Error('Sub user not found');
  }

  const currentPermissions = subUserDoc.data()?.permissions || {};

  await getDb().collection('tenants')
    .doc(tenantId)
    .collection('sub_users')
    .doc(subUserId)
    .update({
      permissions: {
        ...currentPermissions,
        ...permissions,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}


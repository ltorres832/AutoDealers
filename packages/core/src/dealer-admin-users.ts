// Gestión de usuarios administradores de dealers

import { DealerAdminUser, DealerAdminPermissions, UserStatus } from './types';
import { getFirestore, getAuth } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

const DEFAULT_DEALER_ADMIN_PERMISSIONS: DealerAdminPermissions = {
  canManageInventory: true,
  canManageLeads: true,
  canManageSellers: true,
  canManageCampaigns: true,
  canManagePromotions: true,
  canManageSettings: true,
  canManageIntegrations: true,
  canViewReports: true,
  canManageUsers: false, // Por defecto no puede crear otros admin users
};

/**
 * Crea un nuevo usuario administrador de dealer(s)
 */
export async function createDealerAdminUser(
  email: string,
  password: string,
  name: string,
  tenantIds: string[], // Array de tenant IDs que puede administrar
  dealerId: string, // ID del dealer que lo crea
  permissions: Partial<DealerAdminPermissions>,
  createdBy: string
): Promise<DealerAdminUser> {
  // Verificar que el email no esté en uso
  try {
    await auth.getUserByEmail(email);
    throw new Error('El email ya está en uso');
  } catch (error: any) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  // Crear usuario en Firebase Auth
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: name,
  });

  // Establecer custom claims - puede tener acceso a múltiples tenants
  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'dealer_admin',
    isDealerAdmin: true,
    tenantIds, // Array de tenant IDs
    dealerId,
    createdBy,
  });

  // Crear documento en Firestore
  const dealerAdminUser: Omit<DealerAdminUser, 'id'> = {
    email,
    name,
    role: 'dealer_admin',
    tenantIds,
    dealerId,
    permissions: {
      ...DEFAULT_DEALER_ADMIN_PERMISSIONS,
      ...permissions,
    },
    createdBy,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await getDb().collection('dealer_admin_users').doc(userRecord.uid).set({
    ...dealerAdminUser,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  // También crear en la colección de usuarios para compatibilidad
  await getDb().collection('users').doc(userRecord.uid).set({
    email,
    name,
    role: 'dealer',
    tenantId: tenantIds[0], // Primer tenant como principal
    dealerId,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: userRecord.uid,
    ...dealerAdminUser,
  };
}

/**
 * Obtiene todos los usuarios administradores de un dealer
 */
export async function getDealerAdminUsers(dealerId?: string): Promise<DealerAdminUser[]> {
  let query: admin.firestore.Query = getDb().collection('dealer_admin_users');

  if (dealerId) {
    query = query.where('dealerId', '==', dealerId);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      lastLogin: data?.lastLogin?.toDate(),
    } as DealerAdminUser;
  });
}

/**
 * Obtiene un usuario administrador de dealer por ID
 */
export async function getDealerAdminUserById(userId: string): Promise<DealerAdminUser | null> {
  const doc = await getDb().collection('dealer_admin_users').doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
    lastLogin: data?.lastLogin?.toDate(),
  } as DealerAdminUser;
}

/**
 * Actualiza los tenants que puede administrar un usuario
 */
export async function updateDealerAdminTenants(
  userId: string,
  tenantIds: string[]
): Promise<void> {
  await getDb().collection('dealer_admin_users').doc(userId).update({
    tenantIds,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  // Actualizar custom claims en Firebase Auth
  const user = await getDealerAdminUserById(userId);
  if (user) {
    await auth.setCustomUserClaims(userId, {
      role: 'dealer_admin',
      isDealerAdmin: true,
      tenantIds,
      dealerId: user.dealerId,
      createdBy: user.createdBy,
    });
  }
}

/**
 * Actualiza los permisos de un usuario administrador de dealer
 */
export async function updateDealerAdminPermissions(
  userId: string,
  permissions: Partial<DealerAdminPermissions>
): Promise<void> {
  const user = await getDealerAdminUserById(userId);
  if (!user) {
    throw new Error('Usuario administrador de dealer no encontrado');
  }

  await getDb().collection('dealer_admin_users').doc(userId).update({
    permissions: {
      ...user.permissions,
      ...permissions,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Cambia el estado de un usuario administrador de dealer
 */
export async function updateDealerAdminStatus(
  userId: string,
  status: UserStatus
): Promise<void> {
  await getDb().collection('dealer_admin_users').doc(userId).update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  // También actualizar en Firebase Auth si está suspendido
  if (status === 'suspended') {
    await auth.updateUser(userId, { disabled: true });
  } else if (status === 'active') {
    await auth.updateUser(userId, { disabled: false });
  }
}

/**
 * Elimina un usuario administrador de dealer
 */
export async function deleteDealerAdminUser(userId: string): Promise<void> {
  // Marcar como cancelado en lugar de eliminar
  await getDb().collection('dealer_admin_users').doc(userId).update({
    status: 'cancelled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  // Deshabilitar en Firebase Auth
  await auth.updateUser(userId, { disabled: true });
}

/**
 * Crea un usuario que tiene identidades múltiples (vendedor + admin)
 * Si un vendedor también será admin del dealer, se crean credenciales separadas
 */
export async function createMultiIdentityUser(
  email: string,
  passwordSeller: string, // Password para identidad de vendedor
  passwordAdmin: string,  // Password para identidad de admin (puede ser diferente)
  name: string,
  sellerData: {
    tenantId: string;
    dealerId?: string;
  },
  adminData: {
    tenantIds: string[];
    dealerId: string;
    permissions: Partial<DealerAdminPermissions>;
  },
  createdBy: string
): Promise<{ sellerUserId: string; adminUserId: string }> {
  // Crear usuario como vendedor (primera identidad)
  const sellerUserRecord = await auth.createUser({
    email: `${email}+seller`, // Email modificado para vendedor
    password: passwordSeller,
    displayName: `${name} (Vendedor)`,
  });

  await auth.setCustomUserClaims(sellerUserRecord.uid, {
    role: 'seller',
    tenantId: sellerData.tenantId,
    dealerId: sellerData.dealerId,
    identityType: 'seller',
  });

  // Crear usuario como admin (segunda identidad)
  const adminUserRecord = await auth.createUser({
    email: `${email}+admin`, // Email modificado para admin
    password: passwordAdmin,
    displayName: `${name} (Admin)`,
  });

  await auth.setCustomUserClaims(adminUserRecord.uid, {
    role: 'dealer_admin',
    isDealerAdmin: true,
    tenantIds: adminData.tenantIds,
    dealerId: adminData.dealerId,
    identityType: 'admin',
  });

  // Guardar relación entre identidades
  await getDb().collection('multi_identity_users').add({
    primaryEmail: email,
    sellerUserId: sellerUserRecord.uid,
    adminUserId: adminUserRecord.uid,
    name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Crear documentos para cada identidad
  await getDb().collection('users').doc(sellerUserRecord.uid).set({
    email: `${email}+seller`,
    name: `${name} (Vendedor)`,
    role: 'seller',
    tenantId: sellerData.tenantId,
    dealerId: sellerData.dealerId,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  await getDb().collection('dealer_admin_users').doc(adminUserRecord.uid).set({
    email: `${email}+admin`,
    name: `${name} (Admin)`,
    role: 'dealer_admin',
    tenantIds: adminData.tenantIds,
    dealerId: adminData.dealerId,
    permissions: {
      ...DEFAULT_DEALER_ADMIN_PERMISSIONS,
      ...adminData.permissions,
    },
    createdBy,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    sellerUserId: sellerUserRecord.uid,
    adminUserId: adminUserRecord.uid,
  };
}






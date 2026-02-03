// Gestión de usuarios administradores del sistema

import { AdminUserType, AdminPermissions, UserStatus } from './types';
import { AdminUser } from './admin-permissions';
import { getFirestore, getAuth } from './firebase';
import * as admin from 'firebase-admin';

const db = getFirestore();
const auth = getAuth();

const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  canManageUsers: true,
  canManageTenants: true,
  canManageMemberships: true,
  canManageSettings: true,
  canManageIntegrations: true,
  canViewReports: true,
  canManageLogs: true,
  canManageBranding: true,
};

/**
 * Crea un nuevo usuario administrador del sistema
 */
export async function createAdminUser(
  email: string,
  password: string,
  name: string,
  permissions: Partial<AdminPermissions>,
  createdBy: string
): Promise<AdminUser> {
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

  // Establecer custom claims
  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'admin' as any,
    isAdminUser: true,
    createdBy,
  });

  // Crear documento en Firestore
  const adminUser: Omit<AdminUser, 'id'> = {
    email,
    name,
    role: 'admin' as any,
    permissions: [] as any,
    createdBy,
    isActive: true,
    createdAt: new Date(),
  } as any;

  await db.collection('admin_users').doc(userRecord.uid).set({
    ...adminUser,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  // También crear en la colección de usuarios para compatibilidad
  await db.collection('users').doc(userRecord.uid).set({
    email,
    name,
    role: 'admin',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: userRecord.uid,
    ...adminUser,
  };
}

/**
 * Obtiene todos los usuarios administradores
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const snapshot = await db.collection('admin_users').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      lastLogin: data?.lastLogin?.toDate(),
    } as unknown as AdminUser;
  });
}

/**
 * Obtiene un usuario administrador por ID
 */
export async function getAdminUserById(userId: string): Promise<AdminUser | null> {
  const doc = await db.collection('admin_users').doc(userId).get();

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
  } as unknown as AdminUser;
}

/**
 * Actualiza un usuario administrador
 */
export async function updateAdminUser(
  userId: string,
  updates: Partial<AdminUser>
): Promise<void> {
  await db.collection('admin_users').doc(userId).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Actualiza los permisos de un usuario administrador
 */
export async function updateAdminUserPermissions(
  userId: string,
  permissions: Partial<AdminPermissions>
): Promise<void> {
  const user = await getAdminUserById(userId);
  if (!user) {
    throw new Error('Usuario administrador no encontrado');
  }

  await db.collection('admin_users').doc(userId).update({
    permissions: {
      ...user.permissions,
      ...permissions,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);
}

/**
 * Cambia el estado de un usuario administrador
 */
export async function updateAdminUserStatus(
  userId: string,
  status: UserStatus
): Promise<void> {
  await db.collection('admin_users').doc(userId).update({
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
 * Elimina un usuario administrador
 */
export async function deleteAdminUser(userId: string): Promise<void> {
  // Marcar como cancelado en lugar de eliminar
  await db.collection('admin_users').doc(userId).update({
    status: 'cancelled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  // Deshabilitar en Firebase Auth
  await auth.updateUser(userId, { disabled: true });
}






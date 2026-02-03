/**
 * Gestión de Usuarios Admin
 */

import { getAuth, getFirestore } from './firebase';
import { AdminUser, AdminPermission, ADMIN_ROLES } from './admin-permissions';
import * as admin from 'firebase-admin';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}

/**
 * Crea un nuevo usuario admin
 */
export async function createAdminUser(data: {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'viewer';
  customPermissions?: AdminPermission[];
}, createdBy: string): Promise<AdminUser> {
  const auth = getAuth();
  const db = getFirestore();

  try {
    // 1. Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
    });

    // 2. Obtener permisos del rol + permisos custom
    const rolePermissions = ADMIN_ROLES[data.role].permissions;
    const permissions = data.customPermissions 
      ? [...new Set([...rolePermissions, ...data.customPermissions])]
      : rolePermissions;

    // 3. Crear documento en Firestore
    const adminUserData = {
      email: data.email,
      name: data.name,
      role: data.role,
      permissions,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy,
    };

    await getDb().collection('admin_users').doc(userRecord.uid).set(adminUserData);

    // 4. Agregar claims personalizados
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      adminRole: data.role,
      permissions,
    });

    return {
      id: userRecord.uid,
      ...data,
      permissions,
      isActive: true,
      createdAt: new Date(),
      createdBy,
    };
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    throw new Error(`Error al crear usuario admin: ${error.message}`);
  }
}

/**
 * Obtiene un usuario admin por ID
 */
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const db = getFirestore();
  
  try {
    const doc = await getDb().collection('admin_users').doc(userId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    return {
      id: doc.id,
      email: data?.email || '',
      name: data?.name || '',
      role: data?.role || 'viewer',
      permissions: data?.permissions || [],
      isActive: data?.isActive !== false,
      createdAt: data?.createdAt?.toDate() || new Date(),
      createdBy: data?.createdBy || '',
      lastLogin: data?.lastLogin?.toDate(),
    };
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

/**
 * Obtiene todos los usuarios admin
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const db = getFirestore();
  
  try {
    const snapshot = await getDb().collection('admin_users')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || '',
        name: data.name || '',
        role: data.role || 'viewer',
        permissions: data.permissions || [],
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy || '',
        lastLogin: data.lastLogin?.toDate(),
      };
    });
  } catch (error) {
    console.error('Error getting admin users:', error);
    return [];
  }
}

/**
 * Actualiza un usuario admin
 */
export async function updateAdminUser(
  userId: string,
  updates: {
    name?: string;
    role?: 'super_admin' | 'admin' | 'moderator' | 'viewer';
    customPermissions?: AdminPermission[];
    isActive?: boolean;
  }
): Promise<void> {
  const auth = getAuth();
  const db = getFirestore();

  try {
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (updates.name) {
      updateData.name = updates.name;
      await auth.updateUser(userId, { displayName: updates.name });
    }

    if (updates.role) {
      updateData.role = updates.role;
      
      // Actualizar permisos basados en el rol
      const rolePermissions = ADMIN_ROLES[updates.role].permissions;
      const permissions = updates.customPermissions
        ? [...new Set([...rolePermissions, ...updates.customPermissions])]
        : rolePermissions;
      
      updateData.permissions = permissions;

      // Actualizar claims
      await auth.setCustomUserClaims(userId, {
        role: 'admin',
        adminRole: updates.role,
        permissions,
      });
    } else if (updates.customPermissions) {
      // Solo actualizar permisos custom
      const currentUser = await getAdminUser(userId);
      if (currentUser) {
        const rolePermissions = ADMIN_ROLES[currentUser.role].permissions;
        const permissions = [...new Set([...rolePermissions, ...updates.customPermissions])];
        updateData.permissions = permissions;

        await auth.setCustomUserClaims(userId, {
          role: 'admin',
          adminRole: currentUser.role,
          permissions,
        });
      }
    }

    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
      // Deshabilitar/habilitar usuario en Auth
      await auth.updateUser(userId, { disabled: !updates.isActive });
    }

    await getDb().collection('admin_users').doc(userId).update(updateData);
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    throw new Error(`Error al actualizar usuario admin: ${error.message}`);
  }
}

/**
 * Elimina un usuario admin
 */
export async function deleteAdminUser(userId: string): Promise<void> {
  const auth = getAuth();
  const db = getFirestore();

  try {
    // 1. Eliminar de Firebase Auth
    await auth.deleteUser(userId);
    
    // 2. Eliminar de Firestore
    await getDb().collection('admin_users').doc(userId).delete();
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    throw new Error(`Error al eliminar usuario admin: ${error.message}`);
  }
}

/**
 * Actualiza la última fecha de login
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const db = getFirestore();
  
  try {
    await getDb().collection('admin_users').doc(userId).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}



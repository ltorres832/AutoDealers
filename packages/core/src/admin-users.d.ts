import { AdminUser, AdminPermissions, UserStatus } from './types';
/**
 * Crea un nuevo usuario administrador del sistema
 */
export declare function createAdminUser(email: string, password: string, name: string, permissions: Partial<AdminPermissions>, createdBy: string): Promise<AdminUser>;
/**
 * Obtiene todos los usuarios administradores
 */
export declare function getAdminUsers(): Promise<AdminUser[]>;
/**
 * Obtiene un usuario administrador por ID
 */
export declare function getAdminUserById(userId: string): Promise<AdminUser | null>;
/**
 * Actualiza un usuario administrador
 */
export declare function updateAdminUser(userId: string, updates: Partial<AdminUser>): Promise<void>;
/**
 * Actualiza los permisos de un usuario administrador
 */
export declare function updateAdminUserPermissions(userId: string, permissions: Partial<AdminPermissions>): Promise<void>;
/**
 * Cambia el estado de un usuario administrador
 */
export declare function updateAdminUserStatus(userId: string, status: UserStatus): Promise<void>;
/**
 * Elimina un usuario administrador
 */
export declare function deleteAdminUser(userId: string): Promise<void>;
//# sourceMappingURL=admin-users.d.ts.map
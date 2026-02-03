/**
 * Gestión de Usuarios Admin
 */
import { AdminUser, AdminPermission } from './admin-permissions';
/**
 * Crea un nuevo usuario admin
 */
export declare function createAdminUser(data: {
    email: string;
    password: string;
    name: string;
    role: 'super_admin' | 'admin' | 'moderator' | 'viewer';
    customPermissions?: AdminPermission[];
}, createdBy: string): Promise<AdminUser>;
/**
 * Obtiene un usuario admin por ID
 */
export declare function getAdminUser(userId: string): Promise<AdminUser | null>;
/**
 * Obtiene todos los usuarios admin
 */
export declare function getAllAdminUsers(): Promise<AdminUser[]>;
/**
 * Actualiza un usuario admin
 */
export declare function updateAdminUser(userId: string, updates: {
    name?: string;
    role?: 'super_admin' | 'admin' | 'moderator' | 'viewer';
    customPermissions?: AdminPermission[];
    isActive?: boolean;
}): Promise<void>;
/**
 * Elimina un usuario admin
 */
export declare function deleteAdminUser(userId: string): Promise<void>;
/**
 * Actualiza la última fecha de login
 */
export declare function updateLastLogin(userId: string): Promise<void>;
//# sourceMappingURL=admin-users-management.d.ts.map
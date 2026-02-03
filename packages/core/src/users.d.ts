import { User, UserRole } from './types';
/**
 * Crea un nuevo usuario
 */
export declare function createUser(email: string, password: string, name: string, role: UserRole, tenantId?: string, dealerId?: string, membershipId?: string): Promise<User>;
/**
 * Obtiene un usuario por ID
 */
export declare function getUserById(userId: string): Promise<User | null>;
/**
 * Obtiene usuarios por tenant
 */
export declare function getUsersByTenant(tenantId: string): Promise<User[]>;
/**
 * Actualiza un usuario
 */
export declare function updateUser(userId: string, updates: Partial<User>): Promise<void>;
/**
 * Elimina un usuario (soft delete)
 */
export declare function deleteUser(userId: string): Promise<void>;
//# sourceMappingURL=users.d.ts.map
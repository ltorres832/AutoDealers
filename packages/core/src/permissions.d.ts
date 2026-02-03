import { UserRole } from './types';
import { PERMISSIONS } from './roles';
/**
 * Verifica si un rol tiene un permiso específico
 */
export declare function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS[UserRole]): boolean;
//# sourceMappingURL=permissions.d.ts.map
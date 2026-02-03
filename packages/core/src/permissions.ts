// Sistema de permisos

import { UserRole } from './types';
import { PERMISSIONS } from './roles';

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(
  role: UserRole,
  permission: keyof typeof PERMISSIONS[UserRole]
): boolean {
  return PERMISSIONS[role][permission] ?? false;
}






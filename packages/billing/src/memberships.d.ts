import { Membership, MembershipType } from './types';
/**
 * Crea una nueva membresía
 */
export declare function createMembership(membership: Omit<Membership, 'id' | 'createdAt'>): Promise<Membership>;
/**
 * Obtiene todas las membresías (para admin)
 */
export declare function getMemberships(type?: MembershipType): Promise<Membership[]>;
/**
 * Obtiene todas las membresías activas
 */
export declare function getActiveMemberships(type?: MembershipType): Promise<Membership[]>;
/**
 * Obtiene una membresía por ID
 */
export declare function getMembershipById(membershipId: string): Promise<Membership | null>;
/**
 * Actualiza una membresía
 * Limpia todos los valores undefined antes de actualizar
 */
export declare function updateMembership(membershipId: string, updates: Partial<Membership>): Promise<void>;
/**
 * Verifica si una membresía tiene una feature específica
 */
export declare function hasFeature(membership: Membership, feature: keyof Membership['features']): boolean;
/**
 * Verifica límites de membresía
 */
export declare function checkLimit(membership: Membership, limit: 'maxSellers' | 'maxInventory', currentCount: number): boolean;
//# sourceMappingURL=memberships.d.ts.map
import { User } from './types';
/**
 * Obtiene todos los vendedores de un dealer
 */
export declare function getSellersByDealer(dealerId: string): Promise<User[]>;
/**
 * Suspende un vendedor (solo puede hacerlo el dealer que lo creó)
 */
export declare function suspendSeller(dealerId: string, sellerId: string): Promise<void>;
/**
 * Reactiva un vendedor suspendido
 */
export declare function reactivateSeller(dealerId: string, sellerId: string): Promise<void>;
/**
 * Elimina un vendedor (soft delete - solo puede hacerlo el dealer que lo creó)
 */
export declare function deleteSeller(dealerId: string, sellerId: string): Promise<void>;
//# sourceMappingURL=seller-management.d.ts.map
import { Sale } from './types';
/**
 * Crea una nueva venta
 */
export declare function createSale(saleData: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale>;
/**
 * Obtiene una venta por ID
 */
export declare function getSaleById(tenantId: string, saleId: string): Promise<Sale | null>;
/**
 * Obtiene ventas de un vendedor
 */
export declare function getSalesBySeller(tenantId: string, sellerId: string, startDate?: Date, endDate?: Date): Promise<Sale[]>;
/**
 * Obtiene ventas de un tenant
 */
export declare function getTenantSales(tenantId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: Sale['status'];
}): Promise<Sale[]>;
/**
 * Completa una venta
 */
export declare function completeSale(tenantId: string, saleId: string, documents?: string[]): Promise<void>;
/**
 * Calcula comisión de una venta
 */
export declare function calculateCommission(salePrice: number, commissionRate: number): number;
//# sourceMappingURL=sales.d.ts.map
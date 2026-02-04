import { Vehicle, VehicleFilters, VehicleStatus } from './types';
/**
 * Crea un nuevo vehículo
 */
export declare function createVehicle(tenantId: string, vehicleData: Omit<Vehicle, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'stockNumber'>, sellerId?: string): Promise<Vehicle>;
/**
 * Obtiene un vehículo por ID
 */
export declare function getVehicleById(tenantId: string, vehicleId: string): Promise<Vehicle | null>;
/**
 * Obtiene vehículos con filtros
 */
export declare function getVehicles(tenantId: string, filters?: VehicleFilters): Promise<Vehicle[]>;
/**
 * Actualiza un vehículo
 */
export declare function updateVehicle(tenantId: string, vehicleId: string, updates: Partial<Vehicle>): Promise<void>;
/**
 * Actualiza el estado de un vehículo
 */
export declare function updateVehicleStatus(tenantId: string, vehicleId: string, status: VehicleStatus): Promise<void>;
/**
 * Elimina un vehículo (soft delete)
 */
export declare function deleteVehicle(tenantId: string, vehicleId: string): Promise<void>;
/**
 * Sincroniza inventario con web pública
 */
export declare function syncInventoryToWeb(tenantId: string): Promise<void>;
//# sourceMappingURL=vehicles.d.ts.map
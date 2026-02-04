/**
 * Sube una imagen o video de vehículo
 */
export declare function uploadVehicleImage(tenantId: string, vehicleId: string, file: Buffer, filename: string, contentType?: string): Promise<string>;
/**
 * Elimina una imagen de vehículo
 */
export declare function deleteVehicleImage(tenantId: string, vehicleId: string, filename: string): Promise<void>;
/**
 * Sube logo de tenant
 */
export declare function uploadTenantLogo(tenantId: string, file: Buffer, filename: string, contentType?: string): Promise<string>;
/**
 * Sube favicon de tenant
 */
export declare function uploadTenantFavicon(tenantId: string, file: Buffer, filename: string, contentType?: string): Promise<string>;
/**
 * Valida tipo de archivo de imagen
 */
export declare function validateImageType(contentType: string): boolean;
/**
 * Valida tamaño de archivo
 */
export declare function validateFileSize(size: number, maxSizeMB?: number): boolean;
//# sourceMappingURL=storage.d.ts.map
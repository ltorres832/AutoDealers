/**
 * Sube un archivo a Firebase Storage
 */
export declare function uploadFile(tenantId: string, fileBuffer: Buffer, fileName: string, contentType: string, folder?: string): Promise<string>;
/**
 * Elimina un archivo de Firebase Storage
 */
export declare function deleteFile(fileUrl: string): Promise<void>;
//# sourceMappingURL=storage.d.ts.map
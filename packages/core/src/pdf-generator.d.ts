export interface PDFDocumentOptions {
    tenantId: string;
    userId?: string;
    documentType: 'certificate' | 'contract' | 'invoice' | 'receipt';
    content: {
        title: string;
        body: string;
        metadata?: Record<string, any>;
    };
    includeQR?: boolean;
    qrData?: string;
}
export interface PDFGenerationResult {
    pdfBuffer: Buffer;
    pdfUrl?: string;
}
/**
 * Genera un PDF con la configuración de branding aplicada
 *
 * NOTA: Esta es una función placeholder que debe integrarse con una librería de PDF real
 * como pdfkit, jspdf, pdf-lib, o puppeteer.
 */
export declare function generatePDFWithBranding(options: PDFDocumentOptions): Promise<PDFGenerationResult>;
/**
 * Genera un certificado de compra con branding
 */
export declare function generatePurchaseCertificate(tenantId: string, purchaseId: string, userId?: string): Promise<PDFGenerationResult>;
/**
 * Genera un contrato con branding
 */
export declare function generateContract(tenantId: string, contractId: string, userId?: string): Promise<PDFGenerationResult>;
//# sourceMappingURL=pdf-generator.d.ts.map
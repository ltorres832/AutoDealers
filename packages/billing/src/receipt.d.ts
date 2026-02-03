export interface ReceiptItem {
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}
export interface Receipt {
    receiptNumber: string;
    date: Date;
    customerName: string;
    customerEmail: string;
    items: ReceiptItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    paymentMethod: string;
    transactionId: string;
    currency: string;
}
/**
 * Calcula el tax del 11.5% sobre un monto
 */
export declare function calculateTax(amount: number): number;
/**
 * Calcula el total con tax
 */
export declare function calculateTotalWithTax(amount: number): number;
/**
 * Genera un recibo a partir de una factura de Stripe
 */
export declare function generateReceiptFromInvoice(invoice: any, customerName: string, customerEmail: string): Receipt;
/**
 * Genera HTML del recibo para email
 */
export declare function generateReceiptHTML(receipt: Receipt): string;
/**
 * Genera texto plano del recibo para email
 */
export declare function generateReceiptText(receipt: Receipt): string;
//# sourceMappingURL=receipt.d.ts.map
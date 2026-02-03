export interface FAQ {
    id: string;
    tenantId: string;
    question: string;
    answer: string;
    category?: string;
    keywords: string[];
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Crea una FAQ
 */
export declare function createFAQ(faq: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>): Promise<FAQ>;
/**
 * Obtiene FAQs activas
 */
export declare function getActiveFAQs(tenantId: string): Promise<FAQ[]>;
/**
 * Busca FAQ por pregunta o keywords
 */
export declare function findFAQ(tenantId: string, query: string): Promise<FAQ | null>;
//# sourceMappingURL=faqs.d.ts.map
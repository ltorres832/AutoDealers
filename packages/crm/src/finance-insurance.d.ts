export type FIRequestStatus = 'draft' | 'submitted' | 'under_review' | 'pre_approved' | 'approved' | 'pending_info' | 'rejected';
export type CreditRange = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
export type IncomeType = 'salary' | 'self_employed' | 'business' | 'retirement' | 'other';
export type HousingType = 'rent' | 'own' | 'family';
export interface FIClient {
    id: string;
    tenantId: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    identification?: string;
    vehicleId?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehiclePrice?: number;
    downPayment?: number;
    hasTradeIn?: boolean;
    tradeInDetails?: {
        make?: string;
        model?: string;
        year?: number;
        estimatedValue?: number;
    };
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface FIRequest {
    id: string;
    tenantId: string;
    clientId: string;
    employment: {
        employer?: string;
        position?: string;
        monthlyIncome: number;
        timeAtJob: number;
        incomeType: IncomeType;
    };
    creditInfo: {
        creditRange: CreditRange;
        notes?: string;
    };
    personalInfo: {
        maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
        dependents: number;
        housing: HousingType;
        monthlyHousingPayment?: number;
    };
    status: FIRequestStatus;
    submittedAt?: Date;
    submittedBy?: string;
    reviewedAt?: Date;
    reviewedBy?: string;
    sellerNotes?: string;
    fiManagerNotes?: string;
    internalNotes?: string;
    approvalScore?: ApprovalScore;
    financingCalculation?: FinancingCalculationResult;
    cosigner?: Cosigner;
    combinedScore?: number;
    financingOptions?: FinancingOption[];
    selectedFinancingOption?: string;
    digitalSignatures?: DigitalSignature[];
    history: FIRequestHistory[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface FIRequestHistory {
    id: string;
    action: 'created' | 'submitted' | 'status_changed' | 'note_added' | 'info_requested' | 'reviewed';
    performedBy: string;
    performedByName?: string;
    timestamp: Date;
    previousStatus?: FIRequestStatus;
    newStatus?: FIRequestStatus;
    notes?: string;
    metadata?: Record<string, any>;
}
/**
 * Crea un nuevo cliente F&I
 */
export declare function createFIClient(tenantId: string, clientData: Omit<FIClient, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<FIClient>;
/**
 * Obtiene un cliente F&I por ID
 */
export declare function getFIClientById(tenantId: string, clientId: string): Promise<FIClient | null>;
/**
 * Obtiene todos los clientes F&I de un tenant
 */
export declare function getFIClients(tenantId: string): Promise<FIClient[]>;
/**
 * Actualiza un cliente F&I
 */
export declare function updateFIClient(tenantId: string, clientId: string, updates: Partial<Omit<FIClient, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>>): Promise<void>;
/**
 * Crea una nueva solicitud F&I
 */
export declare function createFIRequest(tenantId: string, requestData: Omit<FIRequest, 'id' | 'tenantId' | 'history' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<FIRequest>;
/**
 * Envía una solicitud F&I al gerente F&I
 */
export declare function submitFIRequest(tenantId: string, requestId: string, submittedBy: string, sellerNotes?: string): Promise<void>;
/**
 * Actualiza el estado de una solicitud F&I (solo gerente F&I)
 */
export declare function updateFIRequestStatus(tenantId: string, requestId: string, newStatus: FIRequestStatus, reviewedBy: string, fiManagerNotes?: string, internalNotes?: string): Promise<void>;
/**
 * Agrega una nota a una solicitud F&I
 */
export declare function addFIRequestNote(tenantId: string, requestId: string, note: string, addedBy: string, isInternal?: boolean): Promise<void>;
/**
 * Obtiene una solicitud F&I por ID
 */
export declare function getFIRequestById(tenantId: string, requestId: string): Promise<FIRequest | null>;
/**
 * Obtiene todas las solicitudes F&I de un tenant
 */
export declare function getFIRequests(tenantId: string, filters?: {
    status?: FIRequestStatus;
    clientId?: string;
    createdBy?: string;
}): Promise<FIRequest[]>;
/**
 * Obtiene el historial completo de una solicitud F&I
 */
export declare function getFIRequestHistory(tenantId: string, requestId: string): Promise<FIRequestHistory[]>;
export interface FinancingCalculator {
    vehiclePrice: number;
    downPayment: number;
    tradeInValue?: number;
    interestRate: number;
    loanTerm: number;
    taxRate?: number;
    fees?: number;
    monthlyIncome?: number;
}
export interface FinancingCalculationResult {
    monthlyPayment: number;
    totalInterest: number;
    totalAmount: number;
    principalAmount: number;
    dtiRatio?: number;
    affordability: 'affordable' | 'tight' | 'unaffordable';
    breakdown: {
        principal: number;
        interest: number;
        tax: number;
        fees: number;
    };
}
/**
 * Calcula el pago mensual y detalles de financiamiento
 */
export declare function calculateFinancing(calc: FinancingCalculator): FinancingCalculationResult;
export interface ApprovalScore {
    score: number;
    probability: number;
    recommendation: 'approve' | 'conditional' | 'reject' | 'needs_cosigner';
    reasons: string[];
    suggestedDownPayment?: number;
    suggestedTerm?: number;
    riskFactors: string[];
    positiveFactors: string[];
}
/**
 * Calcula el score de aprobación basado en múltiples factores
 */
export declare function calculateApprovalScore(request: FIRequest, vehiclePrice: number, downPayment: number, monthlyPayment: number): ApprovalScore;
export interface Cosigner {
    id: string;
    name: string;
    phone: string;
    email: string;
    relationship: 'spouse' | 'parent' | 'sibling' | 'other';
    employment: {
        employer: string;
        monthlyIncome: number;
        timeAtJob: number;
        incomeType: IncomeType;
    };
    creditInfo: {
        creditRange: CreditRange;
        creditScore?: number;
        notes?: string;
    };
    personalInfo: {
        maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
        address?: string;
        identification?: string;
    };
    documents: Array<{
        type: DocumentType;
        url: string;
        uploadedAt: Date;
    }>;
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface DigitalSignature {
    id: string;
    tenantId: string;
    requestId: string;
    documentId: string;
    documentType: DocumentTemplate;
    signers: Array<{
        email: string;
        name: string;
        role: 'client' | 'dealer' | 'cosigner' | 'fi_manager';
        status: 'pending' | 'sent' | 'signed' | 'declined';
        signedAt?: Date;
        signatureUrl?: string;
    }>;
    status: 'draft' | 'sent' | 'signed' | 'declined' | 'expired';
    documentUrl: string;
    signedDocumentUrl?: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export type DocumentTemplate = 'credit_application' | 'pre_approval_letter' | 'rejection_letter' | 'financing_contract' | 'terms_agreement' | 'cosigner_agreement';
export interface FinancingOption {
    id: string;
    lender: string;
    lenderType: 'internal' | 'bank' | 'credit_union' | 'captive' | 'other';
    type: 'purchase' | 'lease';
    interestRate: number;
    monthlyPayment: number;
    totalAmount: number;
    term: number;
    downPayment: number;
    requirements: string[];
    approvalProbability: number;
    isRecommended: boolean;
    features: string[];
    createdAt: Date;
}
export interface CreditReport {
    creditScore: number;
    creditRange: CreditRange;
    paymentHistory: {
        onTime: number;
        late: number;
        missed: number;
        totalAccounts: number;
    };
    currentDebts: number;
    openCreditLines: number;
    inquiries: number;
    verified: boolean;
    reportDate: Date;
    provider: string;
}
export interface DocumentValidation {
    isValid: boolean;
    isLegible: boolean;
    extractedData: Record<string, any>;
    matchesRequest: boolean;
    discrepancies: string[];
    confidence: number;
    validationDate: Date;
}
export interface FIMetrics {
    period: {
        start: Date;
        end: Date;
    };
    approvalRate: number;
    averageProcessingTime: number;
    pendingRequests: number;
    byStatus: Record<FIRequestStatus, number>;
    averageIncome: number;
    averageCreditScore: number;
    averageDownPayment: number;
    averageLoanAmount: number;
    bySeller: Record<string, {
        requests: number;
        approvals: number;
        rejections: number;
        approvalRate: number;
    }>;
    byCreditRange: Record<CreditRange, {
        requests: number;
        approvals: number;
        approvalRate: number;
    }>;
}
export interface FIWorkflow {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    trigger: 'score_threshold' | 'dti_ratio' | 'credit_range' | 'status_change' | 'document_received';
    conditions: Array<{
        field: string;
        operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
        value: any;
    }>;
    actions: Array<{
        type: 'request_documents' | 'change_status' | 'notify' | 'send_email' | 'pre_approve' | 'assign_to';
        config: Record<string, any>;
    }>;
    isActive: boolean;
    runCount: number;
    lastRunAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export type DocumentType = 'identification' | 'proof_of_income' | 'bank_statement' | 'tax_return' | 'employment_letter' | 'pay_stub' | 'proof_of_address' | 'insurance' | 'trade_in_title' | 'other';
export interface DocumentRequest {
    id: string;
    tenantId: string;
    requestId: string;
    clientId: string;
    token: string;
    requestedDocuments: Array<{
        type: DocumentType;
        name: string;
        description?: string;
        required: boolean;
    }>;
    status: 'pending' | 'submitted' | 'reviewed' | 'expired';
    submittedAt?: Date;
    submittedDocuments: Array<{
        id: string;
        type: DocumentType;
        name: string;
        url: string;
        uploadedAt: Date;
    }>;
    requestedBy: string;
    requestedByName?: string;
    createdAt: Date;
    expiresAt: Date;
    updatedAt: Date;
}
/**
 * Crea una solicitud de documentos con link único
 */
export declare function createDocumentRequest(tenantId: string, requestId: string, clientId: string, requestedDocuments: Array<{
    type: DocumentType;
    name: string;
    description?: string;
    required: boolean;
}>, requestedBy: string, expiresInDays?: number): Promise<DocumentRequest>;
/**
 * Obtiene una solicitud de documentos por token
 */
export declare function getDocumentRequestByToken(token: string): Promise<DocumentRequest | null>;
/**
 * Sube un documento a una solicitud
 */
export declare function submitDocumentToRequest(token: string, document: {
    type: DocumentType;
    name: string;
    url: string;
}): Promise<void>;
/**
 * Obtiene todas las solicitudes de documentos de una solicitud F&I
 */
export declare function getDocumentRequestsByFIRequest(tenantId: string, requestId: string): Promise<DocumentRequest[]>;
/**
 * Calcula financiamiento y actualiza la solicitud F&I
 */
export declare function calculateAndUpdateFinancing(tenantId: string, requestId: string, calculator: FinancingCalculator): Promise<FinancingCalculationResult>;
/**
 * Calcula y actualiza el score de aprobación de una solicitud
 */
export declare function calculateAndUpdateApprovalScore(tenantId: string, requestId: string, vehiclePrice: number, downPayment: number, monthlyPayment: number): Promise<ApprovalScore>;
/**
 * Agrega un co-signer a una solicitud F&I
 */
export declare function addCosignerToRequest(tenantId: string, requestId: string, cosignerData: Omit<Cosigner, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'documents'>): Promise<Cosigner>;
/**
 * Calcula score combinado (cliente + co-signer)
 */
export declare function calculateCombinedScore(clientScore: ApprovalScore, cosignerCreditRange: CreditRange): number;
/**
 * Actualiza el estado de un co-signer
 */
export declare function updateCosignerStatus(tenantId: string, requestId: string, status: 'approved' | 'rejected', approvedBy?: string): Promise<void>;
/**
 * Obtiene métricas F&I para un período
 */
export declare function getFIMetrics(tenantId: string, startDate: Date, endDate: Date): Promise<FIMetrics>;
/**
 * Crea un workflow F&I
 */
export declare function createFIWorkflow(tenantId: string, workflowData: Omit<FIWorkflow, 'id' | 'tenantId' | 'runCount' | 'createdAt' | 'updatedAt'>): Promise<FIWorkflow>;
/**
 * Obtiene todos los workflows F&I de un tenant
 */
export declare function getFIWorkflows(tenantId: string, activeOnly?: boolean): Promise<FIWorkflow[]>;
/**
 * Ejecuta workflows activos para una solicitud F&I
 */
export declare function executeFIWorkflows(tenantId: string, request: FIRequest): Promise<void>;
/**
 * Compara múltiples opciones de financiamiento
 */
export declare function compareFinancingOptions(request: FIRequest, vehiclePrice: number, downPayment: number, options: FinancingOption[]): {
    bestOption: FinancingOption;
    comparison: FinancingOption[];
    recommendation: string;
};
/**
 * Valida un documento usando IA (placeholder - requiere implementación con servicio de IA)
 */
export declare function validateDocument(documentUrl: string, documentType: DocumentType, request: FIRequest): Promise<DocumentValidation>;
/**
 * Obtiene reporte de crédito de una API externa (placeholder)
 */
export declare function pullCreditReport(tenantId: string, clientId: string, clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    ssn?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
}, provider?: 'experian' | 'equifax' | 'transunion' | 'mock'): Promise<CreditReport | null>;
//# sourceMappingURL=finance-insurance.d.ts.map
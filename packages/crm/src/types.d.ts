export type LeadSource = 'whatsapp' | 'facebook' | 'instagram' | 'web' | 'email' | 'sms' | 'phone';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'pre_qualified' | 'appointment' | 'test_drive' | 'negotiation' | 'closed' | 'lost';
export interface Lead {
    id: string;
    tenantId: string;
    assignedTo?: string;
    source: LeadSource;
    status: LeadStatus;
    contact: {
        name: string;
        email?: string;
        phone: string;
        preferredChannel: string;
    };
    interestedVehicles?: string[];
    notes: string;
    aiClassification?: {
        priority: 'high' | 'medium' | 'low';
        sentiment: 'positive' | 'neutral' | 'negative';
        intent: string;
    };
    score?: {
        automatic: number;
        manual?: number;
        combined: number;
        lastUpdated: Date;
        history: ScoreHistory[];
    };
    tags?: string[];
    documents?: LeadDocument[];
    interactions: Interaction[];
    createdAt: Date;
    updatedAt: Date;
}
export interface ScoreHistory {
    score: number;
    type: 'automatic' | 'manual';
    reason?: string;
    updatedBy?: string;
    updatedAt: Date;
}
export interface LeadDocument {
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedBy: string;
    uploadedAt: Date;
    size?: number;
    mimeType?: string;
}
export interface Interaction {
    id: string;
    type: 'message' | 'call' | 'email' | 'note' | 'appointment' | 'task' | 'document' | 'workflow';
    content: string;
    userId: string;
    createdAt: Date;
    metadata?: Record<string, any>;
}
export interface Message {
    id: string;
    tenantId: string;
    leadId?: string;
    channel: 'whatsapp' | 'facebook' | 'instagram' | 'email' | 'sms';
    direction: 'inbound' | 'outbound';
    from: string;
    to: string;
    content: string;
    attachments?: string[];
    status: 'sent' | 'delivered' | 'read' | 'failed';
    aiGenerated: boolean;
    metadata: Record<string, any>;
    createdAt: Date;
}
export interface Appointment {
    id: string;
    tenantId: string;
    leadId: string;
    assignedTo: string;
    vehicleIds: string[];
    type: 'consultation' | 'test_drive' | 'delivery';
    scheduledAt: Date;
    duration: number;
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    location?: string;
    notes?: string;
    reminders: Reminder[];
    createdAt: Date;
    updatedAt: Date;
}
export interface Reminder {
    id: string;
    sentAt: Date;
    channel: 'email' | 'sms' | 'whatsapp';
    status: 'pending' | 'sent' | 'failed';
}
export interface Sale {
    id: string;
    tenantId: string;
    leadId?: string;
    vehicleId: string;
    sellerId: string;
    buyer?: {
        fullName: string;
        phone: string;
        email: string;
        address: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
        };
        driverLicenseNumber?: string;
        vehiclePlate?: string;
    };
    enableReminders?: boolean;
    selectedReminders?: string[];
    salePrice: number;
    vehiclePrice: number;
    bonus1?: number;
    bonus2?: number;
    rebate?: number;
    tablilla?: number;
    insurance?: number;
    accessories?: number;
    other?: number;
    total: number;
    currency: string;
    vehicleCommissionRate?: number;
    vehicleCommission?: number;
    insuranceCommissionRate?: number;
    insuranceCommission?: number;
    accessoriesCommissionRate?: number;
    accessoriesCommission?: number;
    totalCommission?: number;
    paymentMethod: string;
    status: 'pending' | 'completed' | 'cancelled';
    documents: string[];
    notes: string;
    createdAt: Date;
    completedAt?: Date;
}
export interface CustomerFile {
    id: string;
    tenantId: string;
    saleId: string;
    customerId: string;
    customerInfo: {
        fullName: string;
        phone: string;
        email: string;
        address?: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
        };
        driverLicenseNumber?: string;
        vehiclePlate?: string;
    };
    vehicleId: string;
    sellerId: string;
    sellerInfo?: {
        id: string;
        name: string;
        email: string;
    };
    documents: CustomerDocument[];
    requestedDocuments: RequestedDocument[];
    uploadToken: string;
    status: 'active' | 'completed' | 'archived' | 'deleted';
    notes: string;
    evidence: EvidenceItem[];
    createdAt: Date;
    updatedAt: Date;
}
export interface CustomerDocument {
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedBy: 'customer' | 'seller' | 'dealer';
    uploadedAt: Date;
    size?: number;
    mimeType?: string;
}
export interface RequestedDocument {
    id: string;
    name: string;
    description?: string;
    type: string;
    required: boolean;
    requestedAt: Date;
    requestedBy: string;
    status: 'pending' | 'received' | 'rejected';
    receivedAt?: Date;
    documentId?: string;
}
export interface EvidenceItem {
    id: string;
    type: 'document' | 'note' | 'communication' | 'payment' | 'other';
    title: string;
    description?: string;
    content?: string;
    documentId?: string;
    url?: string;
    createdBy: string;
    createdAt: Date;
}
export type PreQualificationStatus = 'pre_approved' | 'partially_approved' | 'not_qualified' | 'manual_review';
export type EmploymentType = 'employed' | 'self_employed' | 'retired' | 'unemployed';
export type CreditHistory = 'excellent' | 'good' | 'fair' | 'limited' | 'poor';
export type VehicleType = 'new' | 'used' | 'both';
export interface PreQualification {
    id: string;
    tenantId: string;
    leadId?: string;
    contact: {
        name: string;
        email: string;
        phone: string;
        dateOfBirth: Date;
        identificationNumber: string;
    };
    financial: {
        monthlyIncome: number;
        monthlyExpenses: number;
        employmentType: EmploymentType;
        employmentDuration: number;
        creditHistory: CreditHistory;
    };
    preferences: {
        desiredPriceRange: {
            min: number;
            max: number;
        };
        vehicleType: VehicleType;
        financingTerm: number;
        interestedVehicleId?: string;
    };
    result: {
        status: PreQualificationStatus;
        approvedAmount?: number;
        maxAmount?: number;
        interestRate?: number;
        score: number;
        reasons: string[];
        suggestedVehicles: string[];
    };
    source: 'web' | 'mobile' | 'api';
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    expiresAt: Date;
}
//# sourceMappingURL=types.d.ts.map
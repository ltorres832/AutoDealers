export type CorporateEmailStatus = 'active' | 'suspended' | 'deleted';
export type EmailSignatureType = 'basic' | 'advanced';
export interface CorporateEmail {
    id: string;
    userId: string;
    tenantId: string;
    dealerId?: string;
    email: string;
    emailAlias?: string;
    status: CorporateEmailStatus;
    emailSignature?: string;
    emailSignatureType?: EmailSignatureType;
    zohoEmailId?: string;
    zohoPassword?: string;
    passwordChanged: boolean;
    createdBy: 'user' | 'dealer';
    suspendedAt?: Date;
    reactivatedAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface CorporateEmailUsage {
    tenantId: string;
    emailsUsed: number;
    emailsLimit: number;
}
//# sourceMappingURL=corporate-email.d.ts.map
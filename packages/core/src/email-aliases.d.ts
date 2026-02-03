export type EmailAliasStatus = 'active' | 'suspended' | 'deleted';
export interface EmailAlias {
    id: string;
    alias: string;
    fullEmail: string;
    dealerId: string;
    assignedTo: string;
    active: boolean;
    status: EmailAliasStatus;
    zohoAliasId?: string;
    createdAt: Date;
    updatedAt: Date;
    suspendedAt?: Date;
    reactivatedAt?: Date;
}
export interface Dealer {
    dealerId: string;
    ownerUid: string;
    name: string;
    membresia: string;
    aliasesUsed: number;
    aliasesLimit: number;
    approvedByAdmin: boolean;
    status: 'active' | 'suspended' | 'cancelled' | 'pending';
    subdomain?: string;
    createdAt: Date;
    updatedAt: Date;
    approvedAt?: Date;
    approvedBy?: string;
}
export interface EmailAliasUsage {
    dealerId: string;
    aliasesUsed: number;
    aliasesLimit: number | null;
}
//# sourceMappingURL=email-aliases.d.ts.map
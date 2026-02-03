// Sistema de Aliases de Email (según documento final)

export type EmailAliasStatus = 'active' | 'suspended' | 'deleted';

export interface EmailAlias {
  id: string;
  alias: string; // Parte antes del @ (ej: "ventas" para "ventas@dealer.autodealers.com")
  fullEmail: string; // Email completo (ej: "ventas@dealer1.autodealers.com")
  dealerId: string; // ID del dealer (de la colección dealers)
  assignedTo: string; // UID del usuario asignado
  active: boolean;
  status: EmailAliasStatus;
  zohoAliasId?: string; // ID del alias en Zoho
  createdAt: Date;
  updatedAt: Date;
  suspendedAt?: Date;
  reactivatedAt?: Date;
}

export interface Dealer {
  dealerId: string; // ID único del dealer
  ownerUid: string; // UID del usuario propietario
  name: string; // Nombre del dealer
  membresia: string; // ID de la membresía (ej: "multi_dealer_2")
  aliasesUsed: number; // Cantidad de aliases usados
  aliasesLimit: number; // Límite de aliases según membresía (null = ilimitado)
  approvedByAdmin: boolean; // Si ha sido aprobado por admin (requerido para multi_dealer)
  status: 'active' | 'suspended' | 'cancelled' | 'pending';
  subdomain?: string; // Subdominio del dealer (ej: "dealer1")
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date; // Fecha de aprobación
  approvedBy?: string; // UID del admin que aprobó
}

export interface EmailAliasUsage {
  dealerId: string;
  aliasesUsed: number;
  aliasesLimit: number | null; // null = ilimitado
}




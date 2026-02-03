// Sistema de Email Corporativo

export type CorporateEmailStatus = 'active' | 'suspended' | 'deleted';

export type EmailSignatureType = 'basic' | 'advanced';

export interface CorporateEmail {
  id: string;
  userId: string; // Usuario propietario del email
  tenantId: string; // Tenant al que pertenece
  dealerId?: string; // Dealer que creó el email (si fue creado por dealer)
  email: string; // Email completo (ej: juan@autocity.autoplataforma.com)
  emailAlias?: string; // Alias del email (ej: ventas@ si el email principal es juan@)
  status: CorporateEmailStatus;
  emailSignature?: string; // Firma de email (HTML)
  emailSignatureType?: EmailSignatureType; // Tipo de firma según membresía
  zohoEmailId?: string; // ID del email en Zoho
  zohoPassword?: string; // Contraseña temporal (se guarda hasheada o encriptada)
  passwordChanged: boolean; // Si el usuario cambió la contraseña temporal
  createdBy: 'user' | 'dealer'; // Quién creó el email (usuario o dealer)
  suspendedAt?: Date; // Fecha de suspensión
  reactivatedAt?: Date; // Fecha de reactivación
  expiresAt?: Date; // Fecha de expiración (si aplica)
  createdAt: Date;
  updatedAt: Date;
}

export interface CorporateEmailUsage {
  tenantId: string;
  emailsUsed: number; // Cantidad de emails activos
  emailsLimit: number; // Límite según membresía (null = ilimitado)
}




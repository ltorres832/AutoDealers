// Tipos del módulo de facturación

export type MembershipType = 'dealer' | 'seller';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'suspended'
  | 'trialing'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

// Features ejecutables y configurables
export interface MembershipFeatures {
  // Límites numéricos
  maxSellers?: number; // null = ilimitado
  maxInventory?: number; // null = ilimitado
  maxCampaigns?: number; // null = ilimitado
  maxPromotions?: number; // null = ilimitado
  maxAppointmentsPerMonth?: number; // null = ilimitado
  maxStorageGB?: number; // Almacenamiento en GB
  maxApiCallsPerMonth?: number; // Llamadas a API
  
  // Features booleanas ejecutables
  customSubdomain: boolean;
  customDomain: boolean; // Dominio propio (ej: midealer.com)
  aiEnabled: boolean;
  aiAutoResponses: boolean; // Respuestas automáticas con IA
  aiContentGeneration: boolean; // Generación de contenido con IA
  aiLeadClassification: boolean; // Clasificación automática de leads
  socialMediaEnabled: boolean;
  socialMediaScheduling: boolean; // Programar posts
  socialMediaAnalytics: boolean; // Analytics de redes sociales
  marketplaceEnabled: boolean;
  marketplaceFeatured: boolean; // Destacado en marketplace
  advancedReports: boolean;
  customReports: boolean; // Crear reportes personalizados
  exportData: boolean; // Exportar datos (CSV, Excel, PDF)
  whiteLabel: boolean; // Sin branding de AutoDealers
  apiAccess: boolean; // Acceso a API REST
  webhooks: boolean; // Webhooks personalizados
  ssoEnabled: boolean; // Single Sign-On
  multiLanguage: boolean; // Múltiples idiomas
  customTemplates: boolean; // Templates personalizados
  emailMarketing: boolean; // Marketing por email
  smsMarketing: boolean; // Marketing por SMS
  whatsappMarketing: boolean; // Marketing por WhatsApp
  videoUploads: boolean; // Subir videos de vehículos
  virtualTours: boolean; // Tours virtuales 360°
  liveChat: boolean; // Chat en vivo
  appointmentScheduling: boolean; // Sistema de citas
  paymentProcessing: boolean; // Procesamiento de pagos
  inventorySync: boolean; // Sincronización de inventario
  crmAdvanced: boolean; // CRM avanzado con pipelines
  leadScoring: boolean; // Scoring automático de leads
  automationWorkflows: boolean; // Workflows automatizados
  integrationsUnlimited: boolean; // Integraciones ilimitadas
  prioritySupport: boolean; // Soporte prioritario
  dedicatedManager: boolean; // Gerente de cuenta dedicado
  trainingSessions: boolean; // Sesiones de entrenamiento
  customBranding: boolean; // Branding completamente personalizado
  mobileApp: boolean; // Acceso a app móvil
  offlineMode: boolean; // Modo offline
  dataBackup: boolean; // Backup automático de datos
  complianceTools: boolean; // Herramientas de cumplimiento
  analyticsAdvanced: boolean; // Analytics avanzados
  aBTesting: boolean; // Pruebas A/B
  seoTools: boolean; // Herramientas SEO
  customIntegrations: boolean; // Integraciones personalizadas
  freePromotionsOnLanding: boolean; // Promociones gratuitas en landing page pública
  fiModule: boolean; // Módulo F&I (Finance & Insurance) - Solo Dealers PRO y Enterprise
  fiMultipleManagers: boolean; // Múltiples gerentes F&I (solo Enterprise)
  // Email corporativo
  corporateEmailEnabled: boolean; // Si el plan incluye email corporativo
  maxCorporateEmails?: number; // Límite de emails corporativos (null = ilimitado para Enterprise)
  emailSignatureBasic: boolean; // Firma básica de email
  emailSignatureAdvanced: boolean; // Firma avanzada de email (HTML, imágenes)
  emailAliases: boolean; // Si permite crear alias (ej: ventas@ para juan@)
  // Membresías Multi Dealer
  multiDealerEnabled?: boolean; // Si permite múltiples dealers (requiere aprobación admin)
  maxDealers?: number; // Límite de dealers (1, 2, 3 o null = ilimitado para Multi Dealer 3)
  requiresAdminApproval?: boolean; // Si requiere aprobación de admin (para multi_dealer)
}

export interface Membership {
  id: string;
  name: string;
  type: MembershipType;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: MembershipFeatures;
  stripePriceId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  // Metadata para sincronización
  lastSyncedAt?: Date;
  syncVersion?: number; // Versión de sincronización
}

export interface Subscription {
  id: string;
  tenantId: string;
  userId: string;
  membershipId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  daysPastDue?: number; // Días desde que venció el pago
  suspendedAt?: Date; // Fecha de suspensión
  reactivatedAt?: Date; // Fecha de reactivación
  paymentAttempts?: number; // Intentos de pago fallidos
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}


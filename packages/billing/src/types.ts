// Tipos del módulo de facturación

export type MembershipType = 'dealer' | 'seller' | 'business';

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
  maxLeadsPerMonth?: number; // null = ilimitado
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
  /**
   * Expediente CRM: solicitar documentos al cliente (portal / lista de requeridos).
   * Si es `false`, se bloquea crear nuevas solicitudes. Omitido o `true` = permitido (retrocompatibilidad).
   */
  customerDocumentRequestsEnabled?: boolean;
  /** Máximo de solicitudes de documento al mes (expediente CRM); null/omitido = sin tope mensual */
  maxCustomerDocumentRequestsPerMonth?: number | null;
  // Membresías Multi Dealer
  multiDealerEnabled?: boolean; // Si permite múltiples dealers (requiere aprobación admin)
  /** @deprecated usar multiDealerEnabled; mantener solo por datos históricos */
  multipleDealers?: boolean;
  maxDealers?: number | null; // Concesionarios en la red (principal + asociados); null/omitido = ilimitado
  requiresAdminApproval?: boolean; // Si requiere aprobación de admin (para multi_dealer)
  /** Solo admin puede asignar (demos/cortesía). Oculto en catálogo seller/dealer y registro público. */
  adminAssignOnly?: boolean;
  /** Plan personalizado creado por admin; no aparece en catálogo público ni autoservicio. */
  customMembership?: boolean;

  // ============ Agente de Voz IA ============
  /** Agente de voz IA habilitado (master switch) */
  voiceAIEnabled?: boolean;
  /** Llamadas entrantes atendidas por el agente */
  voiceInboundEnabled?: boolean;
  /** Llamadas salientes automáticas (seguimientos, leads sociales) */
  voiceOutboundEnabled?: boolean;
  /** Citas de servicio/mantenimiento por voz */
  voiceServiceCallsEnabled?: boolean;
  /** Campañas de llamadas masivas (reactivación, cumpleaños) */
  voiceCampaignsEnabled?: boolean;
  /** Minutos de voz al mes (entrantes + salientes); null = ilimitado */
  maxVoiceMinutesPerMonth?: number | null;
  /** Llamadas salientes al mes; null = ilimitado */
  maxVoiceOutboundCallsPerMonth?: number | null;
  /** Llamadas entrantes al mes; null = ilimitado */
  maxVoiceInboundCallsPerMonth?: number | null;

  // ============ DMS / ops ============
  /** Portal Mi compensación (ventas, comisiones, bonos, pagos, vacaciones) */
  compensationPortalEnabled?: boolean;
  /** Módulo servicio / órdenes de reparación */
  dmsServiceEnabled?: boolean;
  /** Módulo piezas */
  dmsPartsEnabled?: boolean;
  /** Finanzas dealer (AR/caja) */
  dmsFinanceEnabled?: boolean;
  /** RR.HH. extendido (asistencia, expediente) */
  dmsHrEnabled?: boolean;
  /** API pública / integraciones tenant */
  publicApiEnabled?: boolean;

  // ============ Límites de uso medibles (metering) ============
  /** Mensajes al mes (WhatsApp/FB/IG/SMS salientes); null = ilimitado */
  maxMessagesPerMonth?: number | null;
  /** Respuestas de IA al mes (chat, clasificación, contenido); null = ilimitado */
  maxAiResponsesPerMonth?: number | null;
  /** Emails al mes; null = ilimitado */
  maxEmailsPerMonth?: number | null;

  // ============ Facturación por exceso (overage) ============
  /** Permite consumir por encima del límite facturando el exceso automáticamente */
  overageBillingEnabled?: boolean;

  // ============ Inventario competitivo (INV360 catch-up; opt-out) ============
  vin_camera_scan?: boolean;
  share_landing?: boolean;
  photo_guide?: boolean;
  bg_remover?: boolean;
  dynamic_scenes?: boolean;
  dealer_site_builder?: boolean;
  daco_labels?: boolean;
  inventory_alliances?: boolean;
  inventory_feed_sync?: boolean;
}

export interface Membership {
  id: string;
  name: string;
  type: MembershipType;
  /** Precio regular (post-lanzamiento / post-intro). */
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: MembershipFeatures;
  stripePriceId: string;
  stripeProductId?: string;
  /**
   * Precio de lanzamiento en catálogo (hasta launchEndsAt).
   * Requiere launchStripePriceId para cobrar correctamente.
   */
  launchPrice?: number;
  launchEndsAt?: Date;
  launchStripePriceId?: string;
  /**
   * Precio intro por N ciclos de facturación; luego pasa a `price` / stripePriceId.
   * Requiere introStripePriceId + stripePriceId (schedule en Stripe).
   */
  introPrice?: number;
  introMonths?: number;
  introStripePriceId?: string;
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
  /** stripe = pago normal; admin_grant = acceso otorgado por admin sin cobro */
  billingSource?: 'stripe' | 'admin_grant';
  customMembershipAssignmentId?: string;
  adminGrantedBy?: string;
  adminGrantedAt?: Date;
  adminRevokedBy?: string;
  adminRevokedAt?: Date;
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
  /** Fin del período de prueba Stripe (primer cobro automático) */
  trialEndsAt?: Date;
  /** Días de cortesía acumulados (admin) */
  courtesyDays?: number;
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


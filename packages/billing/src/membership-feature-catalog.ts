/**
 * Catálogo canónico de features de membresía.
 * Única fuente para admin (create/edit), coerce, display y alineación con gates de runtime.
 */

export type MembershipPlanKind = 'dealer' | 'seller' | 'business';

export type MembershipFeatureEntry = {
  key: string;
  label: string;
  group: string;
  /** Tipos de plan donde el admin puede editar este toggle. */
  planTypes: readonly MembershipPlanKind[];
  /**
   * Opt-out: activo salvo `false` explícito (planes viejos sin la clave siguen con acceso).
   * Opt-in (default): requiere `true` en el plan.
   */
  mode?: 'opt-in' | 'opt-out';
  /** Claves de menú/dashboard que dependen de este toggle (ayuda al admin). */
  unlocks?: readonly string[];
};

/** Alias históricos → clave canónica (membresías viejas / UI antigua). */
export const MEMBERSHIP_FEATURE_ALIASES: Record<string, string> = {
  multipleDealers: 'multiDealerEnabled',
  // snake_case legacy / dashboard keys usados por error contra membership.features
  crm_advanced: 'crmAdvanced',
  advanced_crm: 'crmAdvanced',
  advanced_reports: 'advancedReports',
  automation_workflows: 'automationWorkflows',
  fi_module: 'fiModule',
  ai_enabled: 'aiEnabled',
  appointment_scheduling: 'appointmentScheduling',
  social_media_enabled: 'socialMediaEnabled',
  marketplace_enabled: 'marketplaceEnabled',
  custom_templates: 'customTemplates',
  video_uploads: 'videoUploads',
  live_chat: 'liveChat',
  custom_branding: 'customBranding',
  export_data: 'exportData',
  lead_scoring: 'leadScoring',
  corporate_email: 'corporateEmailEnabled',
  corporate_email_enabled: 'corporateEmailEnabled',
  compensation_portal: 'compensationPortalEnabled',
  compensation_portal_enabled: 'compensationPortalEnabled',
  voice_ai: 'voiceAIEnabled',
  voice_ai_enabled: 'voiceAIEnabled',
  public_api: 'publicApiEnabled',
  public_api_enabled: 'publicApiEnabled',
  dms_service: 'dmsServiceEnabled',
  dms_parts: 'dmsPartsEnabled',
  dms_finance: 'dmsFinanceEnabled',
  dms_hr: 'dmsHrEnabled',
  customer_files: 'customerDocumentRequestsEnabled',
  customer_document_requests: 'customerDocumentRequestsEnabled',
};

export function resolveMembershipFeatureKey(key: string): string {
  return MEMBERSHIP_FEATURE_ALIASES[key] || key;
}

export const MEMBERSHIP_BOOLEAN_FEATURE_CATALOG: readonly MembershipFeatureEntry[] = [
  // Web
  {
    key: 'customSubdomain',
    label: 'Subdominio personalizado',
    group: 'Web y marca',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'customDomain',
    label: 'Dominio propio',
    group: 'Web y marca',
    planTypes: ['dealer', 'seller'],
  },
  {
    key: 'whiteLabel',
    label: 'White label (sin marca AutoDealers)',
    group: 'Web y marca',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'customBranding',
    label: 'Branding personalizado',
    group: 'Web y marca',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['custom_branding'],
  },

  // IA
  {
    key: 'aiEnabled',
    label: 'IA habilitada',
    group: 'Inteligencia artificial',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['ai'],
  },
  {
    key: 'aiAutoResponses',
    label: 'Respuestas automáticas con IA',
    group: 'Inteligencia artificial',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'aiContentGeneration',
    label: 'Generación de contenido con IA',
    group: 'Inteligencia artificial',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'aiLeadClassification',
    label: 'Clasificación automática de leads',
    group: 'Inteligencia artificial',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // Redes
  {
    key: 'socialMediaEnabled',
    label: 'Redes sociales',
    group: 'Redes sociales',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['social_posts', 'campaigns'],
  },
  {
    key: 'socialMediaScheduling',
    label: 'Programar publicaciones',
    group: 'Redes sociales',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'socialMediaAnalytics',
    label: 'Analytics de redes sociales',
    group: 'Redes sociales',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // Marketplace
  {
    key: 'marketplaceEnabled',
    label: 'Acceso al marketplace',
    group: 'Marketplace',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['marketplace'],
  },
  {
    key: 'marketplaceFeatured',
    label: 'Destacado en marketplace',
    group: 'Marketplace',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'freePromotionsOnLanding',
    label: 'Promociones gratis en landing pública',
    group: 'Marketplace',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // Reportes
  {
    key: 'advancedReports',
    label: 'Reportes avanzados',
    group: 'Reportes y datos',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['crm_reports', 'reports'],
  },
  {
    key: 'customReports',
    label: 'Reportes personalizados',
    group: 'Reportes y datos',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'exportData',
    label: 'Exportar datos (CSV, Excel, PDF)',
    group: 'Reportes y datos',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['export_data'],
  },
  {
    key: 'analyticsAdvanced',
    label: 'Analytics avanzados',
    group: 'Reportes y datos',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'aBTesting',
    label: 'Pruebas A/B',
    group: 'Reportes y datos',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // API
  {
    key: 'apiAccess',
    label: 'Acceso a API REST',
    group: 'API e integraciones',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'webhooks',
    label: 'Webhooks',
    group: 'API e integraciones',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'integrationsUnlimited',
    label: 'Integraciones ilimitadas',
    group: 'API e integraciones',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'customIntegrations',
    label: 'Integraciones personalizadas',
    group: 'API e integraciones',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'publicApiEnabled',
    label: 'API pública / apps del tenant',
    group: 'API e integraciones',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // Marketing
  {
    key: 'emailMarketing',
    label: 'Email marketing',
    group: 'Marketing',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'smsMarketing',
    label: 'SMS marketing',
    group: 'Marketing',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'whatsappMarketing',
    label: 'WhatsApp marketing',
    group: 'Marketing',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // CRM
  {
    key: 'crmAdvanced',
    label: 'CRM avanzado (Kanban, tareas)',
    group: 'CRM y leads',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['crm_kanban', 'crm_tasks', 'advanced_crm'],
  },
  {
    key: 'leadScoring',
    label: 'Scoring automático de leads',
    group: 'CRM y leads',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['lead_scoring'],
  },
  {
    key: 'automationWorkflows',
    label: 'Workflows automatizados',
    group: 'CRM y leads',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['crm_workflows'],
  },
  {
    key: 'customerDocumentRequestsEnabled',
    label: 'Solicitar documentos al cliente (expediente)',
    group: 'CRM y leads',
    planTypes: ['dealer', 'seller', 'business'],
    mode: 'opt-out',
    unlocks: ['customer_files'],
  },

  // F&I — dealer y seller (ambos paneles gatean fi_module)
  {
    key: 'fiModule',
    label: 'Módulo F&I (finanzas y seguros)',
    group: 'F&I',
    planTypes: ['dealer', 'seller'],
    unlocks: [
      'fi_module',
      'fi_calculator',
      'fi_scoring',
      'fi_metrics',
      'fi_workflows',
      'fi_cosigner',
      'fi_comparison',
    ],
  },
  {
    key: 'fiMultipleManagers',
    label: 'Varios gerentes F&I',
    group: 'F&I',
    planTypes: ['dealer'],
  },

  // Voz
  {
    key: 'voiceAIEnabled',
    label: 'Agente de Voz IA',
    group: 'Agente de Voz IA',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'voiceInboundEnabled',
    label: 'Llamadas entrantes IA',
    group: 'Agente de Voz IA',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'voiceOutboundEnabled',
    label: 'Llamadas salientes IA',
    group: 'Agente de Voz IA',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'voiceServiceCallsEnabled',
    label: 'Citas de servicio por voz',
    group: 'Agente de Voz IA',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'voiceCampaignsEnabled',
    label: 'Campañas de llamadas',
    group: 'Agente de Voz IA',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'overageBillingEnabled',
    label: 'Facturación automática de excesos (overage)',
    group: 'Agente de Voz IA',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // DMS
  {
    key: 'compensationPortalEnabled',
    label: 'Portal Mi Compensación',
    group: 'DMS / Compensación',
    planTypes: ['dealer', 'seller'],
    mode: 'opt-out',
    unlocks: ['compensation_portal'],
  },
  {
    key: 'dmsServiceEnabled',
    label: 'DMS Servicio / Taller',
    group: 'DMS / Compensación',
    planTypes: ['dealer'],
    mode: 'opt-out',
    unlocks: ['dms_service'],
  },
  {
    key: 'dmsPartsEnabled',
    label: 'DMS Piezas',
    group: 'DMS / Compensación',
    planTypes: ['dealer'],
    mode: 'opt-out',
    unlocks: ['dms_parts'],
  },
  {
    key: 'dmsFinanceEnabled',
    label: 'DMS Finanzas',
    group: 'DMS / Compensación',
    planTypes: ['dealer'],
    mode: 'opt-out',
    unlocks: ['dms_finance'],
  },
  {
    key: 'dmsHrEnabled',
    label: 'DMS RR.HH.',
    group: 'DMS / Compensación',
    planTypes: ['dealer'],
    mode: 'opt-out',
    unlocks: ['dms_hr'],
  },

  // Multimedia
  {
    key: 'videoUploads',
    label: 'Subida de videos',
    group: 'Multimedia',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['video_uploads'],
  },
  {
    key: 'virtualTours',
    label: 'Tours virtuales',
    group: 'Multimedia',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'customTemplates',
    label: 'Plantillas personalizadas',
    group: 'Multimedia',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['contract_templates'],
  },

  // Servicios
  {
    key: 'liveChat',
    label: 'Chat en vivo / chat público',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['public_chat'],
  },
  {
    key: 'appointmentScheduling',
    label: 'Sistema de citas',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['appointments'],
  },
  {
    key: 'paymentProcessing',
    label: 'Procesamiento de pagos',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'inventorySync',
    label: 'Sincronización de inventario',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'ssoEnabled',
    label: 'SSO',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'multiLanguage',
    label: 'Múltiples idiomas',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'mobileApp',
    label: 'App móvil',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'offlineMode',
    label: 'Modo offline',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'dataBackup',
    label: 'Backup automático',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'complianceTools',
    label: 'Herramientas de cumplimiento',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'seoTools',
    label: 'Herramientas SEO',
    group: 'Servicios',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // Inventario competitivo (opt-out)
  {
    key: 'vin_camera_scan',
    label: 'Escaneo VIN con cámara',
    group: 'Inventario competitivo',
    planTypes: ['dealer', 'seller'],
    mode: 'opt-out',
    unlocks: ['vin_camera_scan'],
  },
  {
    key: 'share_landing',
    label: 'Landing + QR para compartir',
    group: 'Inventario competitivo',
    planTypes: ['dealer', 'seller'],
    mode: 'opt-out',
    unlocks: ['share_landing'],
  },
  {
    key: 'photo_guide',
    label: 'Guía de fotos',
    group: 'Inventario competitivo',
    planTypes: ['dealer', 'seller'],
    mode: 'opt-out',
    unlocks: ['photo_guide'],
  },
  {
    key: 'bg_remover',
    label: 'Quitar fondo (IA)',
    group: 'Inventario competitivo',
    planTypes: ['dealer', 'seller'],
    mode: 'opt-out',
    unlocks: ['bg_remover'],
  },
  {
    key: 'dynamic_scenes',
    label: 'Escenas dinámicas',
    group: 'Inventario competitivo',
    planTypes: ['dealer', 'seller'],
    mode: 'opt-out',
    unlocks: ['dynamic_scenes'],
  },
  {
    key: 'daco_labels',
    label: 'Etiquetas DACO + QR',
    group: 'Inventario competitivo',
    planTypes: ['dealer', 'seller'],
    mode: 'opt-out',
    unlocks: ['daco_labels'],
  },
  {
    key: 'dealer_site_builder',
    label: 'Constructor de sitio del dealer',
    group: 'Inventario competitivo',
    planTypes: ['dealer'],
    mode: 'opt-out',
    unlocks: ['dealer_site_builder'],
  },
  {
    key: 'inventory_alliances',
    label: 'Alianzas de inventario',
    group: 'Inventario competitivo',
    planTypes: ['dealer'],
    mode: 'opt-out',
    unlocks: ['inventory_alliances'],
  },
  {
    key: 'inventory_feed_sync',
    label: 'Sync por feed URL',
    group: 'Inventario competitivo',
    planTypes: ['dealer'],
    mode: 'opt-out',
    unlocks: ['inventory_feed_sync'],
  },

  // Soporte
  {
    key: 'prioritySupport',
    label: 'Soporte prioritario',
    group: 'Soporte',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'dedicatedManager',
    label: 'Gerente de cuenta dedicado',
    group: 'Soporte',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'trainingSessions',
    label: 'Sesiones de entrenamiento',
    group: 'Soporte',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // Email corporativo
  {
    key: 'corporateEmailEnabled',
    label: 'Email corporativo',
    group: 'Email corporativo',
    planTypes: ['dealer', 'seller', 'business'],
    unlocks: ['corporate_email'],
  },
  {
    key: 'emailSignatureBasic',
    label: 'Firma básica de email',
    group: 'Email corporativo',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'emailSignatureAdvanced',
    label: 'Firma avanzada de email',
    group: 'Email corporativo',
    planTypes: ['dealer', 'seller', 'business'],
  },
  {
    key: 'emailAliases',
    label: 'Aliases de email',
    group: 'Email corporativo',
    planTypes: ['dealer', 'seller', 'business'],
  },

  // Multi-dealer
  {
    key: 'multiDealerEnabled',
    label: 'Plan multi-concesionario',
    group: 'Multi-dealer',
    planTypes: ['dealer'],
  },
  {
    key: 'requiresAdminApproval',
    label: 'Alta multi-dealer requiere aprobación admin',
    group: 'Multi-dealer',
    planTypes: ['dealer'],
  },
] as const;

export const MEMBERSHIP_NUMERIC_FEATURE_KEYS = [
  'maxSellers',
  'maxInventory',
  'maxCampaigns',
  'maxPromotions',
  'maxLeadsPerMonth',
  'maxAppointmentsPerMonth',
  'maxStorageGB',
  'maxApiCallsPerMonth',
  'maxCorporateEmails',
  'maxDealers',
  'maxCustomerDocumentRequestsPerMonth',
  'maxVoiceMinutesPerMonth',
  'maxVoiceOutboundCallsPerMonth',
  'maxVoiceInboundCallsPerMonth',
  'maxMessagesPerMonth',
  'maxAiResponsesPerMonth',
  'maxEmailsPerMonth',
] as const;

export const ADMIN_BOOLEAN_FEATURE_KEYS = MEMBERSHIP_BOOLEAN_FEATURE_CATALOG.map(
  (e) => e.key
) as unknown as readonly string[];

/** Incluye alias histórico multipleDealers para coerce de datos viejos. */
export const ALL_BOOLEAN_FEATURE_KEYS_FOR_COERCE = [
  ...ADMIN_BOOLEAN_FEATURE_KEYS,
  'multipleDealers',
  'adminAssignOnly',
  'customMembership',
] as const;

export const OPT_OUT_MEMBERSHIP_FEATURE_KEYS = MEMBERSHIP_BOOLEAN_FEATURE_CATALOG.filter(
  (e) => e.mode === 'opt-out'
).map((e) => e.key);

export function getMembershipFeatureLabel(key: string): string {
  const canonical = resolveMembershipFeatureKey(key);
  const entry = MEMBERSHIP_BOOLEAN_FEATURE_CATALOG.find((e) => e.key === canonical);
  return entry?.label || key;
}

export function catalogEntriesForPlan(
  planType: MembershipPlanKind
): MembershipFeatureEntry[] {
  return MEMBERSHIP_BOOLEAN_FEATURE_CATALOG.filter((e) =>
    e.planTypes.includes(planType)
  );
}

export function isOptOutMembershipFeature(key: string): boolean {
  const canonical = resolveMembershipFeatureKey(key);
  return OPT_OUT_MEMBERSHIP_FEATURE_KEYS.includes(canonical);
}

/**
 * Lee un booleano de features respetando alias y modo opt-out.
 */
export function readMembershipFeatureFlag(
  features: Record<string, unknown> | null | undefined,
  key: string
): boolean {
  if (!features || typeof features !== 'object') {
    return isOptOutMembershipFeature(key);
  }
  const canonical = resolveMembershipFeatureKey(key);
  const raw =
    features[canonical] !== undefined
      ? features[canonical]
      : features[key] !== undefined
        ? features[key]
        : (() => {
            const aliasEntry = Object.entries(MEMBERSHIP_FEATURE_ALIASES).find(
              ([, target]) => target === canonical
            );
            return aliasEntry ? features[aliasEntry[0]] : undefined;
          })();

  if (isOptOutMembershipFeature(canonical)) {
    return raw !== false && raw !== 'false';
  }
  return raw === true || raw === 'true';
}

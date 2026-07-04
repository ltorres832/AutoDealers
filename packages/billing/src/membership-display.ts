/**
 * Textos de beneficios de membresía — única fuente para admin, dealer, seller y registro público.
 * Cada checkbox/límite del admin con valor activo debe reflejarse aquí.
 */

import { membershipAllowsMultiDealerNetwork } from './membership-network';

export type MembershipFeaturesLoose = Record<string, unknown>;

export type MembershipPlanKind = 'dealer' | 'seller';

export type DynamicFeatureCatalogEntry = {
  key: string;
  name: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  unit?: string;
};

export type MembershipDisplayOptions = {
  planKind?: MembershipPlanKind;
  dynamicCatalog?: DynamicFeatureCatalogEntry[];
};

/** Claves booleanas del admin que deben tener etiqueta en buildMembershipFeatureLines. */
export const ADMIN_BOOLEAN_FEATURE_KEYS = [
  'customSubdomain',
  'customDomain',
  'aiEnabled',
  'aiAutoResponses',
  'aiContentGeneration',
  'aiLeadClassification',
  'socialMediaEnabled',
  'socialMediaScheduling',
  'socialMediaAnalytics',
  'marketplaceEnabled',
  'marketplaceFeatured',
  'advancedReports',
  'customReports',
  'exportData',
  'whiteLabel',
  'apiAccess',
  'webhooks',
  'ssoEnabled',
  'multiLanguage',
  'customTemplates',
  'emailMarketing',
  'smsMarketing',
  'whatsappMarketing',
  'videoUploads',
  'virtualTours',
  'liveChat',
  'appointmentScheduling',
  'paymentProcessing',
  'inventorySync',
  'crmAdvanced',
  'leadScoring',
  'automationWorkflows',
  'integrationsUnlimited',
  'prioritySupport',
  'dedicatedManager',
  'trainingSessions',
  'customBranding',
  'mobileApp',
  'offlineMode',
  'dataBackup',
  'complianceTools',
  'analyticsAdvanced',
  'aBTesting',
  'seoTools',
  'customIntegrations',
  'freePromotionsOnLanding',
  'corporateEmailEnabled',
  'emailSignatureBasic',
  'emailSignatureAdvanced',
  'emailAliases',
  'multiDealerEnabled',
  'requiresAdminApproval',
  'fiModule',
  'fiMultipleManagers',
  'customerDocumentRequestsEnabled',
] as const;

export const ADMIN_NUMERIC_LIMIT_KEYS = [
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
] as const;

function isMultiDealerPlan(features: MembershipFeaturesLoose): boolean {
  return membershipAllowsMultiDealerNetwork(features);
}

function isTruthyBoolean(v: unknown): boolean {
  return v === true || v === 'true';
}

function num(f: MembershipFeaturesLoose, key: string): number | null | undefined {
  const v = f[key];
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    if (t === '' || t === 'null' || t === 'undefined') return undefined;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

/** Límites numéricos (null = ilimitado; undefined = no mostrar fila). */
export function buildMembershipLimitLines(
  f: MembershipFeaturesLoose,
  options?: { planKind?: MembershipPlanKind }
): string[] {
  const limits: string[] = [];
  const planKind = options?.planKind ?? 'dealer';
  const multiDealer = isMultiDealerPlan(f);

  const push = (key: string, lineNum: (n: number) => string) => {
    const v = num(f, key);
    if (typeof v === 'number' && Number.isFinite(v)) {
      limits.push(lineNum(v));
    }
  };

  if (planKind === 'dealer') {
    if (multiDealer) {
      push(
        'maxDealers',
        (n) =>
          n === 1
            ? '\u{1F3E2} 1 concesionario en la red'
            : `\u{1F3E2} ${n.toLocaleString('es-ES')} concesionarios en la red`
      );
      push(
        'maxSellers',
        (n) =>
          n === 1
            ? '\u{1F465} 1 vendedor por concesionario'
            : `\u{1F465} Hasta ${n.toLocaleString('es-ES')} vendedores por concesionario`
      );
    } else {
      push(
        'maxSellers',
        (n) => `\u{1F465} ${n.toLocaleString('es-ES')} vendedores`
      );
    }
  }

  push(
    'maxInventory',
    (n) => `\u{1F697} ${n.toLocaleString('es-ES')} vehículos`
  );
  push(
    'maxCampaigns',
    (n) => `\u{1F4E2} ${n.toLocaleString('es-ES')} campañas`
  );
  push(
    'maxPromotions',
    (n) => `\u{1F3AF} ${n.toLocaleString('es-ES')} promociones`
  );
  push(
    'maxLeadsPerMonth',
    (n) => `\u{1F4DE} ${n.toLocaleString('es-ES')} leads/mes`
  );
  push(
    'maxAppointmentsPerMonth',
    (n) => `\u{1F4C5} ${n.toLocaleString('es-ES')} citas/mes`
  );
  push(
    'maxStorageGB',
    (n) => `\u{1F4BE} ${n.toLocaleString('es-ES')} GB de almacenamiento`
  );
  push(
    'maxApiCallsPerMonth',
    (n) => `\u{1F50C} ${n.toLocaleString('es-ES')} llamadas API/mes`
  );
  push(
    'maxCustomerDocumentRequestsPerMonth',
    (n) =>
      `\u{1F4CE} ${n.toLocaleString('es-ES')} solicitudes de documento al cliente/mes (expediente)`
  );

  if (typeof f.maxCorporateEmails === 'number' && Number.isFinite(f.maxCorporateEmails)) {
    limits.push(`\u{1F4E7} ${f.maxCorporateEmails} correo(s) corporativo(s)`);
  }

  return limits;
}

/** Capacidades booleanas configurables en el admin. */
export function buildMembershipFeatureLines(
  f: MembershipFeaturesLoose,
  options?: { planKind?: MembershipPlanKind }
): string[] {
  const out: string[] = [];
  const planKind = options?.planKind ?? 'dealer';
  const t = (cond: unknown, label: string) => {
    if (isTruthyBoolean(cond)) out.push(label);
  };

  const hasPublicSite = isTruthyBoolean(f.customSubdomain);

  t(hasPublicSite, '\u{1F310} Página web con subdominio propio (URL pública del concesionario)');
  t(f.customDomain, '\u{1F517} Dominio personalizado (marca propia en la web)');
  t(f.aiEnabled, '\u{1F916} IA habilitada');
  t(f.aiAutoResponses, '\u{1F4AC} Respuestas automáticas (IA)');
  t(f.aiContentGeneration, '\u{2728} Generación de contenido con IA');
  t(f.aiLeadClassification, '\u{1F4CB} Clasificación de leads (IA)');
  t(f.socialMediaEnabled, '\u{1F4F1} Redes sociales');
  t(f.socialMediaScheduling, '\u{1F4C6} Programación en redes');
  t(f.socialMediaAnalytics, '\u{1F4CA} Analytics de redes');
  t(f.marketplaceEnabled, '\u{1F6D2} Marketplace');
  t(f.marketplaceFeatured, '\u2B50 Destacado en marketplace');
  t(f.advancedReports, '\u{1F4C8} Reportes avanzados');
  t(f.customReports, '\u{1F4C4} Reportes personalizados');
  t(f.exportData, '\u2B07\uFE0F Exportar datos');
  t(f.crmAdvanced, '\u{1F4CA} CRM avanzado');
  t(f.leadScoring, '\u{1F3AF} Lead scoring');
  t(f.automationWorkflows, '\u2699\uFE0F Automatización / workflows');
  t(f.apiAccess, '\u{1F50C} API REST');
  t(f.webhooks, '\u{1F517} Webhooks');
  t(f.whiteLabel, '\u{1F3F7}\uFE0F White label');
  t(f.ssoEnabled, '\u{1F510} SSO');
  t(f.multiLanguage, '\u{1F310} Multi-idioma');
  t(f.customTemplates, '\u{1F4DD} Plantillas personalizadas');
  t(f.emailMarketing, '\u{1F4E7} Email marketing');
  t(f.smsMarketing, '\u{1F4F2} SMS marketing');
  t(f.whatsappMarketing, '\u{1F4AC} WhatsApp marketing');
  t(f.videoUploads, '\u{1F3A5} Vídeos de vehículos');
  t(f.virtualTours, '\u{1F504} Tours virtuales');
  t(f.liveChat, '\u{1F4AC} Chat en vivo');
  t(f.appointmentScheduling, '\u{1F4C5} Citas / agenda');
  t(f.paymentProcessing, '\u{1F4B3} Procesamiento de pagos');
  t(f.inventorySync, '\u{1F504} Sincronización de inventario');
  t(f.integrationsUnlimited, '\u{1F50C} Integraciones ilimitadas');
  t(f.prioritySupport, '\u{1F3A7} Soporte prioritario');
  t(f.dedicatedManager, '\u{1F464} Gerente de cuenta');
  t(f.trainingSessions, '\u{1F393} Sesiones de formación');
  t(f.customBranding, '\u{1F3A8} Branding personalizado');
  t(f.mobileApp, '\u{1F4F1} App móvil');
  t(f.offlineMode, '\u{1F4F4} Modo offline');
  t(f.dataBackup, '\u{1F4BE} Copias de seguridad');
  t(f.complianceTools, '\u2696\uFE0F Cumplimiento / compliance');
  t(f.analyticsAdvanced, '\u{1F4CA} Analytics avanzados');
  t(f.aBTesting, '\u{1F9EA} Pruebas A/B');
  t(f.seoTools, '\u{1F50D} Herramientas SEO');
  t(f.customIntegrations, '\u{1F527} Integraciones a medida');
  t(f.freePromotionsOnLanding, '\u{1F3E0} Promociones en la web pública');
  t(f.fiModule, '\u{1F4BC} Módulo F&I (finanzas y seguros)');
  if (planKind === 'dealer') {
    t(f.fiMultipleManagers, '\u{1F465} Varios gerentes F&I');
  }
  t(f.corporateEmailEnabled, '\u{1F4E7} Email corporativo (@tu-marca.dominio)');
  t(f.emailSignatureBasic, '\u2709\uFE0F Firma de email básica');
  t(f.emailSignatureAdvanced, '\u2709\uFE0F Firma de email avanzada');
  t(f.emailAliases, '\u2709\uFE0F Alias de correo');
  if (isTruthyBoolean(f.customerDocumentRequestsEnabled)) {
    out.push('\u{1F4CE} Solicitudes de documentos al cliente (portal / expediente CRM)');
  }
  if (planKind === 'dealer') {
    if (isMultiDealerPlan(f)) {
      t(f.multiDealerEnabled, '\u{1F3E2} Plan multi-concesionario (red de concesionarios)');
      t(f.requiresAdminApproval, '\u{1F4CB} Alta sujeta a aprobación administrativa');
    } else if (isTruthyBoolean(f.multiDealerEnabled)) {
      t(true, '\u{1F3E2} Multi-concesionario (según aprobación)');
    }
  }

  return out;
}

/** Claves ya cubiertas por el catálogo fijo o metadatos internos (no mostrar como extra). */
const INTERNAL_FEATURE_KEYS = new Set([
  'adminAssignOnly',
  'customMembership',
  'multipleDealers',
  'publicWebsite',
  'status',
  'stripePriceId',
]);

function humanizeFeatureKey(key: string): string {
  const spaced = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isKnownCatalogKey(key: string): boolean {
  return (
    INTERNAL_FEATURE_KEYS.has(key) ||
    ADMIN_BOOLEAN_FEATURE_KEYS.includes(key as (typeof ADMIN_BOOLEAN_FEATURE_KEYS)[number]) ||
    ADMIN_NUMERIC_LIMIT_KEYS.includes(key as (typeof ADMIN_NUMERIC_LIMIT_KEYS)[number])
  );
}

/**
 * Beneficios/límites creados dinámicamente en admin (colección dynamic_features)
 * o claves nuevas en features{} que aún no están en el catálogo fijo.
 */
export function buildExtraDynamicDisplayLines(
  f: MembershipFeaturesLoose,
  options?: MembershipDisplayOptions
): { limits: string[]; features: string[] } {
  const limits: string[] = [];
  const features: string[] = [];
  const catalogByKey = new Map((options?.dynamicCatalog || []).map((d) => [d.key, d]));

  for (const [key, raw] of Object.entries(f)) {
    if (isKnownCatalogKey(key)) continue;

    const catalog = catalogByKey.get(key);
    const label = catalog?.name || humanizeFeatureKey(key);
    const type = catalog?.type;

    if (isTruthyBoolean(raw)) {
      features.push(`\u{2728} ${label}`);
      continue;
    }

    if (type === 'number' || (typeof raw === 'number' && !Number.isNaN(raw))) {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(n)) {
        const unit = catalog?.unit ? ` ${catalog.unit}` : '';
        limits.push(`\u{1F4CA} ${label}: ${n.toLocaleString('es-ES')}${unit}`);
      }
      continue;
    }

    if (raw === null && catalog?.type === 'number') {
      continue;
    }

    if (
      (type === 'string' || type === 'select' || typeof raw === 'string') &&
      typeof raw === 'string' &&
      raw.trim()
    ) {
      features.push(`\u{2728} ${label}: ${raw.trim()}`);
    }
  }

  return { limits, features };
}

export function buildMembershipDisplayLines(
  f: MembershipFeaturesLoose | undefined,
  options?: MembershipDisplayOptions
): {
  limits: string[];
  features: string[];
} {
  if (!f || typeof f !== 'object') {
    return { limits: [], features: [] };
  }
  const limits = buildMembershipLimitLines(f, options);
  const features = buildMembershipFeatureLines(f, options);
  const extra = buildExtraDynamicDisplayLines(f, options);
  return {
    limits: [...limits, ...extra.limits],
    features: [...features, ...extra.features],
  };
}

/**
 * Textos de beneficios de membresía — única fuente para admin, dealer, seller y registro público.
 * Cada checkbox/límite del admin con valor activo debe reflejarse aquí.
 */

import { membershipAllowsMultiDealerNetwork } from './membership-network';
import {
  ADMIN_BOOLEAN_FEATURE_KEYS as CATALOG_BOOLEAN_KEYS,
  MEMBERSHIP_NUMERIC_FEATURE_KEYS,
  getMembershipFeatureLabel,
} from './membership-feature-catalog';

export type MembershipFeaturesLoose = Record<string, unknown>;

export type MembershipPlanKind = 'dealer' | 'seller' | 'business';

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

/** Etiqueta visible junto a beneficios anunciados pero aún no disponibles. */
export const COMING_SOON_FEATURE_LABEL = 'Próximamente';

/** Claves de membresía que se muestran con check + badge Próximamente. */
export const COMING_SOON_MEMBERSHIP_FEATURE_KEYS = new Set<string>([
  'voiceAIEnabled',
  'voiceInboundEnabled',
  'voiceOutboundEnabled',
  'voiceServiceCallsEnabled',
]);

export function isComingSoonMembershipFeature(key: string | undefined | null): boolean {
  return Boolean(key && COMING_SOON_MEMBERSHIP_FEATURE_KEYS.has(key));
}

export function withComingSoonFeatureLabel(text: string, featureKey?: string): string {
  if (!isComingSoonMembershipFeature(featureKey)) return text;
  return `${text} · ${COMING_SOON_FEATURE_LABEL}`;
}

export function parseMembershipFeatureLine(line: string): { text: string; comingSoon: boolean } {
  const marker = ` · ${COMING_SOON_FEATURE_LABEL}`;
  if (line.endsWith(marker)) {
    return { text: line.slice(0, -marker.length), comingSoon: true };
  }
  return { text: line, comingSoon: false };
}

/** Claves booleanas del admin que deben tener etiqueta en buildMembershipFeatureLines. */
export const ADMIN_BOOLEAN_FEATURE_KEYS = CATALOG_BOOLEAN_KEYS;

export const ADMIN_NUMERIC_LIMIT_KEYS = MEMBERSHIP_NUMERIC_FEATURE_KEYS;

export { getMembershipFeatureLabel };

/** Beneficios de email corporativo: solo si corporateEmailEnabled está activo. */
export const CORPORATE_EMAIL_DEPENDENT_BOOLEAN_KEYS = [
  'emailSignatureBasic',
  'emailSignatureAdvanced',
  'emailAliases',
] as const;

export const CORPORATE_EMAIL_DEPENDENT_NUMERIC_KEYS = ['maxCorporateEmails'] as const;

/** Beneficios del agente de voz: solo si voiceAIEnabled está activo. */
export const VOICE_AI_DEPENDENT_BOOLEAN_KEYS = [
  'voiceInboundEnabled',
  'voiceOutboundEnabled',
  'voiceServiceCallsEnabled',
  'voiceCampaignsEnabled',
] as const;

export const VOICE_AI_DEPENDENT_NUMERIC_KEYS = [
  'maxVoiceMinutesPerMonth',
  'maxVoiceOutboundCallsPerMonth',
  'maxVoiceInboundCallsPerMonth',
] as const;

/** Claves ya cubiertas por el catálogo fijo o metadatos internos (no mostrar como extra). */
const INTERNAL_FEATURE_KEYS = new Set([
  'adminAssignOnly',
  'customMembership',
  'multipleDealers',
  'publicWebsite',
  'status',
  'stripePriceId',
]);

function isMultiDealerPlan(features: MembershipFeaturesLoose): boolean {
  return membershipAllowsMultiDealerNetwork(features);
}

export function isTruthyMembershipBoolean(v: unknown): boolean {
  return v === true || v === 'true';
}

function isTruthyBoolean(v: unknown): boolean {
  return isTruthyMembershipBoolean(v);
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

/** Elimina hijos huérfanos (firma de email, max correos) si el toggle padre está apagado. */
export function applyMembershipFeatureDependencyGates(
  f: MembershipFeaturesLoose | undefined
): MembershipFeaturesLoose {
  if (!f || typeof f !== 'object') return {};
  const out: MembershipFeaturesLoose = { ...f };

  if (!isTruthyMembershipBoolean(out.corporateEmailEnabled)) {
    for (const key of CORPORATE_EMAIL_DEPENDENT_NUMERIC_KEYS) {
      delete out[key];
    }
    for (const key of CORPORATE_EMAIL_DEPENDENT_BOOLEAN_KEYS) {
      out[key] = false;
    }
  }

  if (!isTruthyMembershipBoolean(out.customerDocumentRequestsEnabled)) {
    delete out.maxCustomerDocumentRequestsPerMonth;
  }

  if (!isTruthyMembershipBoolean(out.voiceAIEnabled)) {
    for (const key of VOICE_AI_DEPENDENT_NUMERIC_KEYS) {
      delete out[key];
    }
    for (const key of VOICE_AI_DEPENDENT_BOOLEAN_KEYS) {
      out[key] = false;
    }
  }

  if (!isTruthyMembershipBoolean(out.multiDealerEnabled)) {
    delete out.maxDealers;
    out.requiresAdminApproval = false;
    out.multipleDealers = false;
  }

  return out;
}

/** Solo deja claves que el admin configuró explícitamente para mostrar en catálogo. */
export function compactFeaturesForCatalogDisplay(
  f: MembershipFeaturesLoose | undefined
): MembershipFeaturesLoose {
  if (!f || typeof f !== 'object') return {};
  const gated = applyMembershipFeatureDependencyGates(f);
  const out: MembershipFeaturesLoose = {};

  for (const key of ADMIN_BOOLEAN_FEATURE_KEYS) {
    if (isTruthyBoolean(gated[key])) out[key] = true;
  }

  for (const key of ADMIN_NUMERIC_LIMIT_KEYS) {
    const v = num(gated, key);
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
  }

  const known = new Set<string>([
    ...ADMIN_BOOLEAN_FEATURE_KEYS,
    ...ADMIN_NUMERIC_LIMIT_KEYS,
    ...INTERNAL_FEATURE_KEYS,
  ]);

  for (const [key, raw] of Object.entries(gated)) {
    if (known.has(key)) continue;
    if (isTruthyBoolean(raw)) out[key] = true;
    else if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === 'string' && raw.trim()) out[key] = raw.trim();
  }

  return out;
}

/** Límites numéricos (solo número explícito; null/undefined no se muestran). */
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
    (n) =>
      planKind === 'business'
        ? `\u{1F9F0} ${n.toLocaleString('es-ES')} piezas o productos`
        : `\u{1F697} ${n.toLocaleString('es-ES')} vehículos`
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
  if (isTruthyBoolean(f.voiceAIEnabled)) {
    push(
      'maxVoiceMinutesPerMonth',
      (n) => `\u{1F399}\uFE0F ${n.toLocaleString('es-ES')} minutos de voz IA/mes`
    );
    push(
      'maxVoiceOutboundCallsPerMonth',
      (n) => `\u{1F4DE} ${n.toLocaleString('es-ES')} llamadas salientes IA/mes`
    );
    push(
      'maxVoiceInboundCallsPerMonth',
      (n) => `\u{1F4F2} ${n.toLocaleString('es-ES')} llamadas entrantes IA/mes`
    );
  }
  push(
    'maxMessagesPerMonth',
    (n) => `\u{1F4AC} ${n.toLocaleString('es-ES')} mensajes/mes`
  );
  push(
    'maxAiResponsesPerMonth',
    (n) => `\u{1F916} ${n.toLocaleString('es-ES')} respuestas IA/mes`
  );
  push(
    'maxEmailsPerMonth',
    (n) => `\u{1F4E7} ${n.toLocaleString('es-ES')} emails/mes`
  );

  if (
    isTruthyBoolean(f.corporateEmailEnabled) &&
    typeof f.maxCorporateEmails === 'number' &&
    Number.isFinite(f.maxCorporateEmails)
  ) {
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
  const t = (cond: unknown, label: string, key?: string) => {
    if (isTruthyBoolean(cond)) out.push(withComingSoonFeatureLabel(label, key));
  };

  const hasPublicSite = isTruthyBoolean(f.customSubdomain);

  if (hasPublicSite) {
    out.push(
      planKind === 'business'
        ? '\u{1F310} Página web con subdominio propio (ficha pública del taller o servicio)'
        : '\u{1F310} Página web con subdominio propio (URL pública del concesionario)'
    );
  }
  if (planKind !== 'business') {
    t(f.customDomain, '\u{1F517} Dominio personalizado (marca propia en la web)');
  }
  t(f.aiEnabled, '\u{1F916} IA habilitada');
  t(f.aiAutoResponses, '\u{1F4AC} Respuestas automáticas (IA)');
  t(f.aiContentGeneration, '\u{2728} Generación de contenido con IA');
  t(f.aiLeadClassification, '\u{1F4CB} Clasificación de leads (IA)');
  t(f.socialMediaEnabled, '\u{1F4F1} Redes sociales');
  t(f.socialMediaScheduling, '\u{1F4C6} Programación en redes');
  t(f.socialMediaAnalytics, '\u{1F4CA} Analytics de redes');
  t(
    f.marketplaceEnabled,
    planKind === 'business'
      ? '\u{1F6D2} Directorio público de servicios (/servicios)'
      : '\u{1F6D2} Marketplace'
  );
  t(
    f.marketplaceFeatured,
    planKind === 'business'
      ? '\u2B50 Destacado en el directorio de servicios'
      : '\u2B50 Destacado en marketplace'
  );
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
  t(
    f.videoUploads,
    planKind === 'business' ? '\u{1F3A5} Vídeos de tus servicios' : '\u{1F3A5} Vídeos de vehículos'
  );
  t(f.virtualTours, '\u{1F504} Tours virtuales');
  t(f.liveChat, '\u{1F4AC} Chat en vivo');
  t(f.appointmentScheduling, '\u{1F4C5} Citas / agenda');
  t(f.paymentProcessing, '\u{1F4B3} Procesamiento de pagos');
  t(f.inventorySync, '\u{1F504} Sincronización de inventario');
  t(f.vin_camera_scan, '\u{1F4F7} Escaneo VIN con cámara / decodificación');
  t(f.share_landing, '\u{1F517} Landing y QR para compartir vehículo');
  t(f.photo_guide, '\u{1F4F8} Guía de fotos por ángulos');
  t(f.bg_remover, '\u{1F3A8} Quitar fondo de fotos (IA)');
  t(f.dynamic_scenes, '\u{1F3AC} Escenas dinámicas (fondos de estudio)');
  if (planKind === 'dealer') {
    t(f.dealer_site_builder, '\u{1F310} Constructor de sitio web del dealer');
    t(f.inventory_alliances, '\u{1F91D} Alianzas de inventario entre dealers');
    t(f.inventory_feed_sync, '\u{1F4E5} Sincronización de inventario por feed URL');
  }
  t(f.daco_labels, '\u{1F3F7}\uFE0F Etiquetas DACO imprimibles con QR');
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
  const corporateEmailOn = isTruthyBoolean(f.corporateEmailEnabled);
  t(corporateEmailOn, '\u{1F4E7} Email corporativo (@tu-marca.dominio)');
  if (corporateEmailOn) {
    t(f.emailSignatureBasic, '\u2709\uFE0F Firma de email básica');
    t(f.emailSignatureAdvanced, '\u2709\uFE0F Firma de email avanzada');
    t(f.emailAliases, '\u2709\uFE0F Alias de correo');
  }
  if (isTruthyBoolean(f.customerDocumentRequestsEnabled)) {
    out.push('\u{1F4CE} Solicitudes de documentos al cliente (portal / expediente CRM)');
  }
  const voiceAIOn = isTruthyBoolean(f.voiceAIEnabled);
  t(voiceAIOn, '\u{1F399}\uFE0F Agente de Voz IA (llamadas con voz humana en español)', 'voiceAIEnabled');
  if (voiceAIOn) {
    t(f.voiceInboundEnabled, '\u{1F4F2} Llamadas entrantes atendidas por IA', 'voiceInboundEnabled');
    t(f.voiceOutboundEnabled, '\u{1F4DE} Llamadas de seguimiento automáticas (IA)', 'voiceOutboundEnabled');
    t(f.voiceServiceCallsEnabled, '\u{1F527} Citas de servicio/mantenimiento por voz', 'voiceServiceCallsEnabled');
    t(f.voiceCampaignsEnabled, '\u{1F4E3} Campañas de llamadas (reactivación, cumpleaños)');
  }
  t(f.overageBillingEnabled, '\u{1F4B0} Uso adicional con facturación automática (sin bloqueos)');
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
  const compact = compactFeaturesForCatalogDisplay(f);
  const limits = buildMembershipLimitLines(compact, options);
  const features = buildMembershipFeatureLines(compact, options);
  const extra = buildExtraDynamicDisplayLines(compact, options);
  const out = {
    limits: [...limits, ...extra.limits],
    features: [...features, ...extra.features],
  };
  // Membresías de servicios (type/planKind business): nunca mostrar copy de dealer/concesionario.
  if (options?.planKind === 'business') {
    const junk = /dealer|dealers|concesionario|concesionarios/i;
    return {
      limits: out.limits.filter((line) => !junk.test(line)),
      features: out.features.filter((line) => !junk.test(line)),
    };
  }
  return out;
}

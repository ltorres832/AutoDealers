/**
 * Textos de planes para UI pública — alineado con el seed (create-default-memberships.ts)
 * y con la lógica más completa que había en /registro (paso 4).
 */

import { isMultiDealerPlan } from './membership-flags';

export type MembershipFeaturesLoose = Record<string, unknown>;

/** Dealer: cupo de vendedores en la sede. Multi-dealer: maxDealers (red) + maxSellers por concesionario. Seller: cuenta individual. */
export type MembershipPlanKind = 'dealer' | 'seller';

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

/** Límites numéricos (null = ilimitado explícito en Firestore; undefined = no mostrar fila). */
export function buildMembershipLimitLines(
  f: MembershipFeaturesLoose,
  options?: { planKind?: MembershipPlanKind }
): string[] {
  const limits: string[] = [];
  const planKind = options?.planKind ?? 'dealer';
  const multiDealer = isMultiDealerPlan(f);

  const push = (key: string, lineNum: (n: number) => string, lineUnlimited: string) => {
    const v = num(f, key);
    if (typeof v === 'number') limits.push(lineNum(v));
    else if (v === null) limits.push(lineUnlimited);
  };

  if (planKind === 'dealer') {
    if (multiDealer) {
      // Red: cuántos concesionarios bajo la cuenta corporativa.
      push(
        'maxDealers',
        (n) =>
          n === 1
            ? '\u{1F3E2} 1 concesionario en la red'
            : `\u{1F3E2} ${n.toLocaleString('es-ES')} concesionarios en la red`,
        '\u{1F3E2} Concesionarios ilimitados en la red'
      );
      // Por sede: el seed usa el mismo campo maxSellers que en dealer estándar, aplica a cada concesionario.
      push(
        'maxSellers',
        (n) =>
          n === 1
            ? '\u{1F465} 1 vendedor por concesionario'
            : `\u{1F465} Hasta ${n.toLocaleString('es-ES')} vendedores por concesionario`,
        '\u{1F465} Vendedores ilimitados por concesionario'
      );
    } else {
      // Dealer estándar (una sede): cupo de vendedores del equipo.
      push(
        'maxSellers',
        (n) => `\u{1F465} ${n.toLocaleString('es-ES')} vendedores`,
        '\u{1F465} Vendedores ilimitados'
      );
    }
  }
  push(
    'maxInventory',
    (n) => `\u{1F697} ${n.toLocaleString('es-ES')} vehículos`,
    '\u{1F697} Inventario ilimitado'
  );
  push(
    'maxCampaigns',
    (n) => `\u{1F4E2} ${n.toLocaleString('es-ES')} campañas`,
    '\u{1F4E2} Campañas ilimitadas'
  );
  push(
    'maxPromotions',
    (n) => `\u{1F3AF} ${n.toLocaleString('es-ES')} promociones`,
    '\u{1F3AF} Promociones ilimitadas'
  );
  push(
    'maxLeadsPerMonth',
    (n) => `\u{1F4DE} ${n.toLocaleString('es-ES')} leads/mes`,
    '\u{1F4DE} Leads ilimitados/mes'
  );
  push(
    'maxAppointmentsPerMonth',
    (n) => `\u{1F4C5} ${n.toLocaleString('es-ES')} citas/mes`,
    '\u{1F4C5} Citas ilimitadas/mes'
  );
  push(
    'maxStorageGB',
    (n) => `\u{1F4BE} ${n.toLocaleString('es-ES')} GB de almacenamiento`,
    '\u{1F4BE} Almacenamiento ilimitado'
  );
  push(
    'maxApiCallsPerMonth',
    (n) => `\u{1F50C} ${n.toLocaleString('es-ES')} llamadas API/mes`,
    '\u{1F50C} Llamadas API ilimitadas/mes'
  );
  push(
    'maxCustomerDocumentRequestsPerMonth',
    (n) =>
      `\u{1F4CE} ${n.toLocaleString('es-ES')} solicitudes de documento al cliente/mes (expediente)`,
    '\u{1F4CE} Solicitudes de documento al cliente ilimitadas/mes'
  );

  if (typeof f.maxCorporateEmails === 'number') {
    limits.push(`\u{1F4E7} ${f.maxCorporateEmails} correo(s) corporativo(s)`);
  } else if (f.maxCorporateEmails === null) {
    limits.push('\u{1F4E7} Correos corporativos ilimitados');
  }

  return limits;
}

/** Capacidades booleanas (seed + tipos billing). */
export function buildMembershipFeatureLines(
  f: MembershipFeaturesLoose,
  options?: { planKind?: MembershipPlanKind }
): string[] {
  const out: string[] = [];
  const planKind = options?.planKind ?? 'dealer';
  const t = (cond: unknown, label: string) => {
    if (cond === true) out.push(label);
  };

  t(f.customSubdomain, '\u{1F310} Página web con subdominio propio (URL pública del concesionario)');
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
  if (f.customerDocumentRequestsEnabled !== false) {
    out.push('\u{1F4CE} Solicitudes de documentos al cliente (portal / expediente CRM)');
  }
  if (planKind === 'dealer') {
    if (isMultiDealerPlan(f)) {
      t(f.multiDealerEnabled, '\u{1F3E2} Plan multi-concesionario (red de concesionarios)');
      t(f.requiresAdminApproval, '\u{1F4CB} Alta sujeta a aprobación administrativa');
    } else {
      t(f.multiDealerEnabled, '\u{1F3E2} Multi-concesionario (según aprobación)');
    }
  }

  return out;
}

export function buildMembershipDisplayLines(
  f: MembershipFeaturesLoose | undefined,
  options?: { planKind?: MembershipPlanKind }
): {
  limits: string[];
  features: string[];
} {
  if (!f || typeof f !== 'object') {
    return { limits: [], features: [] };
  }
  return {
    limits: buildMembershipLimitLines(f, options),
    features: buildMembershipFeatureLines(f, options),
  };
}

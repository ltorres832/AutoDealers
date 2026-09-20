/**
 * Cruza `feature_flags` (apagado global) con las features reales del plan (`memberships`)
 * para menús y toggles de UI en dealer/seller.
 */

import type { DashboardType } from './feature-flags';
import { isFeatureEnabled } from './feature-flags';
import { getTenantMembershipFeatures } from './membership-validation';
import {
  isOptOutMembershipFeature,
  readMembershipFeatureFlag,
} from '@autodealers/billing/membership-feature-catalog';

/** Claves en `membership.features`; todas deben ser truthy (AND), salvo opt-out. */
export type MembershipFeatureKey =
  | 'crmAdvanced'
  | 'automationWorkflows'
  | 'advancedReports'
  | 'fiModule'
  | 'aiEnabled'
  | 'appointmentScheduling'
  | 'socialMediaEnabled'
  | 'marketplaceEnabled'
  | 'customTemplates'
  | 'videoUploads'
  | 'customerDocumentRequestsEnabled'
  | 'liveChat'
  | 'freePromotionsOnLanding'
  | 'corporateEmailEnabled'
  | 'customBranding'
  | 'exportData'
  | 'leadScoring'
  | 'compensationPortalEnabled'
  | 'dmsServiceEnabled'
  | 'dmsPartsEnabled'
  | 'dmsFinanceEnabled'
  | 'dmsHrEnabled'
  | 'vin_camera_scan'
  | 'share_landing'
  | 'photo_guide'
  | 'bg_remover'
  | 'dynamic_scenes'
  | 'dealer_site_builder'
  | 'daco_labels'
  | 'inventory_alliances'
  | 'inventory_feed_sync';

const DEALER_FEATURE_MEMBERSHIP: Record<string, readonly MembershipFeatureKey[] | null> = {
  crm_kanban: ['crmAdvanced'],
  crm_tasks: ['crmAdvanced'],
  crm_workflows: ['automationWorkflows'],
  crm_reports: ['advancedReports'],
  advanced_crm: ['crmAdvanced'],
  reports: ['advancedReports'],
  fi_module: ['fiModule'],
  fi_calculator: ['fiModule'],
  fi_scoring: ['fiModule'],
  fi_metrics: ['fiModule'],
  fi_workflows: ['fiModule'],
  fi_cosigner: ['fiModule'],
  fi_comparison: ['fiModule'],
  ai: ['aiEnabled'],
  social_posts: ['socialMediaEnabled'],
  campaigns: ['socialMediaEnabled'],
  marketplace: ['marketplaceEnabled'],
  contract_templates: ['customTemplates'],
  video_uploads: ['videoUploads'],
  customer_files: ['customerDocumentRequestsEnabled'],
  appointments: ['appointmentScheduling'],
  public_chat: ['liveChat'],
  corporate_email: ['corporateEmailEnabled'],
  custom_branding: ['customBranding'],
  export_data: ['exportData'],
  lead_scoring: ['leadScoring'],
  compensation_portal: ['compensationPortalEnabled'],
  // DMS siempre disponible en el panel (no bloquear por plan con false legado)
  dms_service: null,
  dms_parts: null,
  dms_finance: null,
  dms_hr: null,
  // Inventario competitivo (flag global AND plan; opt-out en membership)
  vin_camera_scan: ['vin_camera_scan'],
  share_landing: ['share_landing'],
  photo_guide: ['photo_guide'],
  bg_remover: ['bg_remover'],
  dynamic_scenes: ['dynamic_scenes'],
  dealer_site_builder: ['dealer_site_builder'],
  daco_labels: ['daco_labels'],
  inventory_alliances: ['inventory_alliances'],
  inventory_feed_sync: ['inventory_feed_sync'],
};

const SELLER_FEATURE_MEMBERSHIP: Record<string, readonly MembershipFeatureKey[] | null> = {
  ...DEALER_FEATURE_MEMBERSHIP,
  // Solo dealer
  dealer_site_builder: null,
  inventory_alliances: null,
  inventory_feed_sync: null,
};

export function getMembershipFeatureKeysForDashboardKey(
  dashboard: DashboardType,
  featureKey: string
): readonly MembershipFeatureKey[] | null {
  if (dashboard === 'dealer') {
    return DEALER_FEATURE_MEMBERSHIP[featureKey] ?? null;
  }
  if (dashboard === 'seller') {
    return SELLER_FEATURE_MEMBERSHIP[featureKey] ?? null;
  }
  return null;
}

export function membershipFeaturesAllow(
  features: Record<string, unknown> | undefined,
  keys: readonly MembershipFeatureKey[]
): boolean {
  if (!features) {
    return keys.length > 0 && keys.every((key) => isOptOutMembershipFeature(key));
  }
  for (const key of keys) {
    if (!readMembershipFeatureFlag(features, key)) {
      return false;
    }
  }
  return true;
}

/**
 * ¿El plan del tenant cumple los requisitos para mostrar este módulo?
 * Si no hay mapeo, devuelve true (no se restringe por membresía).
 */
export async function membershipAllowsDashboardFeature(
  dashboard: DashboardType,
  featureKey: string,
  tenantId: string | undefined
): Promise<boolean> {
  const required = getMembershipFeatureKeysForDashboardKey(dashboard, featureKey);
  if (required == null) {
    return true;
  }
  // Sin tenant: no bloquear módulos opt-out. El resto sigue restringido.
  if (!tenantId?.trim()) {
    return membershipFeaturesAllow(undefined, required);
  }
  const features = await getTenantMembershipFeatures(tenantId.trim());
  return membershipFeaturesAllow(features ?? undefined, required);
}

/**
 * Flag global AND requisitos de plan (cuando aplica).
 */
export async function resolveDashboardFeatureEnabled(
  dashboard: DashboardType,
  featureKey: string,
  tenantId: string | undefined | null
): Promise<boolean> {
  const globalOn = await isFeatureEnabled(dashboard, featureKey);
  if (!globalOn) {
    return false;
  }
  const planOk = await membershipAllowsDashboardFeature(dashboard, featureKey, tenantId ?? undefined);
  return planOk;
}

/**
 * Resuelve varios módulos del menú en una sola pasada (lectura fresca del plan).
 */
export async function resolveDashboardFeaturesBatch(
  dashboard: DashboardType,
  featureKeys: string[],
  tenantId: string | undefined | null
): Promise<Record<string, boolean>> {
  const unique = [...new Set(featureKeys.filter(Boolean))];
  const out: Record<string, boolean> = {};
  await Promise.all(
    unique.map(async (key) => {
      out[key] = await resolveDashboardFeatureEnabled(dashboard, key, tenantId ?? undefined);
    })
  );
  return out;
}

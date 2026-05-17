/**
 * Cruza `feature_flags` (apagado global) con las features reales del plan (`memberships`)
 * para menús y toggles de UI en dealer/seller.
 *
 * - Si no hay mapeo para un `featureKey`, solo aplica el flag global (comportamiento previo).
 * - Si hay mapeo y no hay tenant o membresía, el módulo queda deshabilitado para la UI.
 */

import type { DashboardType } from './feature-flags';
import { isFeatureEnabled } from './feature-flags';
import { getTenantMembership } from './membership-validation';

/** Claves en `membership.features`; todas deben ser truthy (AND). */
type MembershipFeatureKey =
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
  | 'customerDocumentRequestsEnabled';

const DEALER_FEATURE_MEMBERSHIP: Record<string, readonly MembershipFeatureKey[] | null> = {
  crm_kanban: ['crmAdvanced'],
  crm_tasks: ['crmAdvanced'],
  crm_workflows: ['automationWorkflows'],
  crm_reports: ['advancedReports'],
  advanced_crm: ['crmAdvanced'],
  fi_module: ['fiModule'],
  fi_calculator: ['fiModule'],
  fi_scoring: ['fiModule'],
  fi_metrics: ['fiModule'],
  fi_workflows: ['fiModule'],
  fi_cosigner: ['fiModule'],
  fi_comparison: ['fiModule'],
  ai: ['aiEnabled'],
  /** Reportes generales del menú (no Kanban): alinear con reportes avanzados */
  reports: ['advancedReports'],
  /** Publicaciones en redes — coherente con APIs de social */
  social_posts: ['socialMediaEnabled'],
  /** Catálogo premium / marketplace */
  marketplace: ['marketplaceEnabled'],
  /** Plantillas de comunicación / documentos */
  contract_templates: ['customTemplates'],
  /** Vídeos de inventario */
  video_uploads: ['videoUploads'],
  /** Expediente / solicitudes al cliente */
  customer_files: ['customerDocumentRequestsEnabled'],
};

const SELLER_FEATURE_MEMBERSHIP: Record<string, readonly MembershipFeatureKey[] | null> = {
  crm_kanban: ['crmAdvanced'],
  crm_tasks: ['crmAdvanced'],
  crm_workflows: ['automationWorkflows'],
  crm_reports: ['advancedReports'],
  advanced_crm: ['crmAdvanced'],
  fi_module: ['fiModule'],
  fi_calculator: ['fiModule'],
  fi_scoring: ['fiModule'],
  fi_cosigner: ['fiModule'],
  ai: ['aiEnabled'],
  reports: ['advancedReports'],
  social_posts: ['socialMediaEnabled'],
  marketplace: ['marketplaceEnabled'],
  contract_templates: ['customTemplates'],
  video_uploads: ['videoUploads'],
  customer_files: ['customerDocumentRequestsEnabled'],
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

function membershipFeaturesAllow(
  features: Record<string, unknown> | undefined,
  keys: readonly MembershipFeatureKey[]
): boolean {
  if (!features) {
    return false;
  }
  for (const key of keys) {
    const v = features[key];
    if (key === 'customerDocumentRequestsEnabled') {
      if (v === false) {
        return false;
      }
      continue;
    }
    if (v !== true) {
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
  if (!tenantId?.trim()) {
    return false;
  }
  const membership = await getTenantMembership(tenantId.trim());
  if (!membership?.features) {
    return false;
  }
  return membershipFeaturesAllow(membership.features as unknown as Record<string, unknown>, required);
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

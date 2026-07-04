import { coerceMembershipNumber, repairMisserializedEpochNumber } from '@/lib/membership-number-utils';

/**
 * Normalización de features al guardar desde el admin.
 * Solo lo guardado aquí es lo que puede aparecer en tarjetas y catálogos.
 */

export const ADMIN_NUMERIC_FEATURE_KEYS = [
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
  'multipleDealers',
  'requiresAdminApproval',
  'fiModule',
  'fiMultipleManagers',
  'customerDocumentRequestsEnabled',
] as const;

const KNOWN_FEATURE_KEYS = new Set<string>([
  ...ADMIN_NUMERIC_FEATURE_KEYS,
  ...ADMIN_BOOLEAN_FEATURE_KEYS,
]);

function normalizeNumeric(v: unknown): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined;
  const repaired = repairMisserializedEpochNumber(v);
  const n = coerceMembershipNumber(repaired);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** Convierte features de Firestore al formulario de edición (vacío = no configurado). */
export function normalizeFeaturesForAdminEdit(
  features: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!features || typeof features !== 'object') return {};
  const out: Record<string, unknown> = { ...features };

  for (const key of ADMIN_NUMERIC_FEATURE_KEYS) {
    const v = out[key];
    if (v === null || v === undefined || v === '') {
      delete out[key];
      continue;
    }
    const n = normalizeNumeric(v);
    if (n === undefined) delete out[key];
    else out[key] = n;
  }

  for (const key of ADMIN_BOOLEAN_FEATURE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = out[key] === true || out[key] === 'true';
    }
  }

  return out;
}

/**
 * Reemplaza por completo las features al guardar desde el admin.
 * - Booleanos: siempre true/false explícito.
 * - Numéricos: solo se guardan si el admin puso un número (vacío = sin clave).
 * - Dinámicos/otros: se conservan si tienen valor activo.
 */
export function prepareAdminMembershipFeaturesForSave(
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const key of ADMIN_BOOLEAN_FEATURE_KEYS) {
    out[key] = patch[key] === true || patch[key] === 'true';
  }

  for (const key of ADMIN_NUMERIC_FEATURE_KEYS) {
    const n = normalizeNumeric(patch[key]);
    if (n !== undefined) out[key] = n;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (KNOWN_FEATURE_KEYS.has(key) || value === undefined) continue;
    if (value === false || value === null || value === '') continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    out[key] = value;
  }

  return out;
}

/** @deprecated Usar prepareAdminMembershipFeaturesForSave (reemplazo total). */
export function mergeAndNormalizeMembershipFeatures(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return prepareAdminMembershipFeaturesForSave({ ...(existing || {}), ...patch });
}

/**
 * Dos planes no deben compartir el mismo precio para el mismo tipo, moneda y ciclo (producto distinto por precio).
 */
export async function assertUniqueMembershipPrice(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  type: string;
  currency: string;
  billingCycle: string;
  price: number;
  excludeMembershipId?: string;
}): Promise<{ ok: true } | { ok: false; duplicateId: string }> {
  const { db, type, currency, billingCycle, price, excludeMembershipId } = params;
  const snap = await db.collection('memberships').where('type', '==', type).get();
  const cur = String(currency || '').toLowerCase();
  const cyc = String(billingCycle || '');
  const pr = Number(price);
  for (const doc of snap.docs) {
    if (excludeMembershipId && doc.id === excludeMembershipId) continue;
    const d = doc.data();
    if (String(d.currency || '').toLowerCase() !== cur) continue;
    if (String(d.billingCycle || '') !== cyc) continue;
    if (Number(d.price) === pr) {
      return { ok: false, duplicateId: doc.id };
    }
  }
  return { ok: true };
}

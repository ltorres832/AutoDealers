/**
 * Normalización de features al guardar desde el admin.
 * Debe conservar cualquier clave futura en `features` y solo normalizar campos conocidos.
 */

const NUMERIC_FEATURE_KEYS = [
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

const BOOLEAN_FEATURE_KEYS = [
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

function normalizeNumeric(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const parsed = parseInt(String(v), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function mergeAndNormalizeMembershipFeatures(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(existing || {}), ...patch };

  for (const key of NUMERIC_FEATURE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      merged[key] = normalizeNumeric(patch[key]);
    }
  }

  for (const key of BOOLEAN_FEATURE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      merged[key] = Boolean(patch[key]);
    }
  }

  return merged;
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

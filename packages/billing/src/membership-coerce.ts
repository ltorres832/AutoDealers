/** Repara precios guardados como epoch ISO (299 → "1970-01-01T00:00:00.299Z"). */
export function coerceMembershipPrice(value: unknown): number {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^1970-01-01T00:00:00\.\d{3}Z$/.test(trimmed)) {
      const ms = new Date(trimmed).getTime();
      if (Number.isFinite(ms) && ms < 86_400_000) return ms;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function repairMisserializedEpochNumber(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^1970-01-01T00:00:00\.\d{3}Z$/.test(trimmed)) {
      const ms = new Date(trimmed).getTime();
      if (Number.isFinite(ms) && ms < 86_400_000) return ms;
    }
  }
  return value;
}

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
  'adminAssignOnly',
  'customMembership',
] as const;

function normalizeNumeric(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === '' || v === null) return null;
  const repaired = repairMisserializedEpochNumber(v);
  const n = coerceMembershipPrice(repaired);
  return n === 0 && repaired !== 0 && repaired !== '0' ? null : n;
}

/** Normaliza features leídas de Firestore para UI pública y paneles. */
export function normalizeMembershipFeatures(
  features: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!features || typeof features !== 'object') return {};
  const out: Record<string, unknown> = { ...features };

  for (const key of NUMERIC_FEATURE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = normalizeNumeric(out[key]);
    }
  }

  for (const key of BOOLEAN_FEATURE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      const v = out[key];
      out[key] = v === true || v === 'true';
    }
  }

  return out;
}

/** Serializa una membresía para respuestas JSON de Next.js. */
export function serializeMembershipForApi(
  membership: Record<string, unknown> & { id: string }
): Record<string, unknown> {
  const createdAt = membership.createdAt;
  const createdAtIso =
    createdAt instanceof Date
      ? createdAt.toISOString()
      : typeof createdAt === 'string'
        ? createdAt
        : undefined;

  return {
    ...membership,
    price: coerceMembershipPrice(membership.price),
    createdAt: createdAtIso,
    features: normalizeMembershipFeatures(
      (membership.features as Record<string, unknown> | undefined) ?? undefined
    ),
  };
}

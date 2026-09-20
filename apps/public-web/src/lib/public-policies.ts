import { getFirestore } from '@/lib/firebase-admin';

export type PublicPolicyType =
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'returns'
  | 'warranty'
  | 'shipping'
  | 'data_protection'
  | 'disclaimer'
  | 'custom';

export type PublicPolicy = {
  id?: string;
  slug?: string;
  type: PublicPolicyType;
  title: string;
  content: string;
  enabled: boolean;
  version?: string;
  language?: string;
  lastUpdated?: string;
  effectiveDate?: string;
  tenantName?: string;
  tenantSubdomain?: string;
};

const PUBLIC_POLICY_TYPES: PublicPolicyType[] = [
  'privacy',
  'terms',
  'cookies',
  'returns',
  'warranty',
  'shipping',
  'data_protection',
  'disclaimer',
  'custom',
];

function timestampToDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function normalizeAdminType(type: string): string {
  if (type === 'cookies') return 'cookie';
  if (type === 'returns') return 'refund';
  return type;
}

function toPublicType(type: string): PublicPolicyType {
  if (type === 'cookie') return 'cookies';
  if (type === 'refund') return 'returns';
  return (type || 'custom') as PublicPolicyType;
}

function tenantPolicyKey(type: string): string {
  if (type === 'cookie') return 'cookies';
  if (type === 'refund') return 'returns';
  return type;
}

function policyDateMs(value: unknown): number {
  return timestampToDate(value)?.getTime() ?? 0;
}

function isPolicyCurrentlyEffective(data: Record<string, any>): boolean {
  const now = Date.now();
  const effective = timestampToDate(data.effectiveDate);
  const expiration = timestampToDate(data.expirationDate);
  if (effective && effective.getTime() > now) return false;
  if (expiration && expiration.getTime() < now) return false;
  return true;
}

function mapPlatformPolicy(doc: { id: string; data: () => Record<string, any> }): PublicPolicy {
  const data = doc.data();
  const lastUpdated =
    timestampToDate(data.updatedAt) || timestampToDate(data.effectiveDate) || new Date();

  return {
    id: doc.id,
    slug: doc.id,
    type: toPublicType(String(data.type || 'custom')),
    title: String(data.title || ''),
    content: String(data.content || ''),
    enabled: data.isActive !== false,
    version: String(data.version || '1.0'),
    language: String(data.language || 'es'),
    effectiveDate: (timestampToDate(data.effectiveDate) || lastUpdated).toISOString(),
    lastUpdated: lastUpdated.toISOString(),
  };
}

async function resolveTenant(subdomain: string) {
  const normalized = (subdomain || '').trim().toLowerCase();
  if (!normalized) return null;

  const db = getFirestore();
  const snap = await db
    .collection('tenants')
    .where('subdomain', '==', normalized)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as Record<string, any> };
}

async function getPlatformPolicies(language = 'es', tenantId?: string): Promise<PublicPolicy[]> {
  const db = getFirestore();

  // Keep this intentionally broad to avoid requiring composite indexes for public reads.
  const snap = await db.collection('policies').where('isActive', '==', true).get();

  return snap.docs
    .filter((doc) => {
      const data = doc.data() as Record<string, any>;
      if (String(data.language || 'es') !== language) return false;
      if (!Array.isArray(data.applicableTo) || !data.applicableTo.includes('public')) return false;
      if (!isPolicyCurrentlyEffective(data)) return false;
      if (data.tenantId && data.tenantId !== tenantId) return false;
      return true;
    })
    .sort((a, b) => {
      const ad = a.data() as Record<string, any>;
      const bd = b.data() as Record<string, any>;
      const aTenant = ad.tenantId && ad.tenantId === tenantId ? 1 : 0;
      const bTenant = bd.tenantId && bd.tenantId === tenantId ? 1 : 0;
      if (aTenant !== bTenant) return bTenant - aTenant;
      return policyDateMs(bd.effectiveDate || bd.updatedAt) - policyDateMs(ad.effectiveDate || ad.updatedAt);
    })
    .map(mapPlatformPolicy);
}

export async function getPublicPlatformPolicies(language = 'es'): Promise<PublicPolicy[]> {
  return getPlatformPolicies(language);
}

function tenantPolicyToPublicPolicy(
  type: PublicPolicyType,
  policy: Record<string, any>,
  tenant: { data: Record<string, any> },
  fallbackSlug?: string
): PublicPolicy {
  const lastUpdated = timestampToDate(policy.lastUpdated) || new Date();
  return {
    id: String(policy.id || fallbackSlug || type),
    slug: String(policy.id || fallbackSlug || type),
    type,
    title: String(policy.title || ''),
    content: String(policy.content || ''),
    enabled: policy.enabled !== false,
    lastUpdated: lastUpdated.toISOString(),
    tenantName: tenant.data.name || '',
    tenantSubdomain: tenant.data.subdomain || '',
  };
}

export async function getPublicPolicyByType(
  rawType: string,
  options?: { subdomain?: string; language?: string }
): Promise<PublicPolicy | null> {
  const language = options?.language || 'es';
  const rawKey = String(rawType || '').trim();
  const adminType = normalizeAdminType(rawType);
  const publicType = toPublicType(adminType);
  const tenant = options?.subdomain ? await resolveTenant(options.subdomain) : null;

  if (tenant) {
    const policies = tenant.data.policies || {};
    const tenantPolicy = policies[rawKey] || policies[tenantPolicyKey(adminType)];
    if (tenantPolicy && tenantPolicy.enabled !== false) {
      return tenantPolicyToPublicPolicy(publicType, tenantPolicy, tenant, rawKey);
    }
  }

  const platformPolicies = await getPlatformPolicies(language, tenant?.id);
  return platformPolicies.find((policy) =>
    policy.id === rawKey ||
    policy.slug === rawKey ||
    normalizeAdminType(policy.type) === adminType
  ) || null;
}

export async function getPublicPoliciesForSubdomain(
  subdomain: string,
  language = 'es'
): Promise<{ tenant: Record<string, any> | null; policies: Record<string, PublicPolicy>; allPolicies: PublicPolicy[] }> {
  const tenant = await resolveTenant(subdomain);
  const policies: Record<string, PublicPolicy> = {};
  const allPolicies: PublicPolicy[] = [];

  if (tenant) {
    const tenantPolicies = tenant.data.policies || {};
    for (const [key, tenantPolicy] of Object.entries(tenantPolicies)) {
      if (tenantPolicy && tenantPolicy.enabled !== false) {
        const rawType = String((tenantPolicy as Record<string, any>).type || key);
        const type = toPublicType(normalizeAdminType(rawType));
        const mapped = tenantPolicyToPublicPolicy(type, tenantPolicy as Record<string, any>, tenant, key);
        allPolicies.push(mapped);
        if (!policies[type]) policies[type] = mapped;
      }
    }
  }

  const platformPolicies = await getPlatformPolicies(language, tenant?.id);
  for (const policy of platformPolicies) {
    allPolicies.push({
      ...policy,
      tenantName: tenant?.data.name || undefined,
      tenantSubdomain: tenant?.data.subdomain || undefined,
    });
    if (!policies[policy.type]) {
      policies[policy.type] = {
        ...policy,
        tenantName: tenant?.data.name || undefined,
        tenantSubdomain: tenant?.data.subdomain || undefined,
      };
    }
  }

  return {
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.data.name || '',
          subdomain: tenant.data.subdomain || subdomain,
          branding: tenant.data.branding || {},
          description: tenant.data.description || '',
        }
      : null,
    policies,
    allPolicies,
  };
}

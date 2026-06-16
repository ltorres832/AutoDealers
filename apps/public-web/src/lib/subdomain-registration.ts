import type { Firestore } from 'firebase-admin/firestore';

export const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'www',
  'api',
  'app',
  'dealer',
  'dealer-app',
  'seller',
  'seller-app',
  'advertiser',
  'public-web',
  'public-web-app',
]);

export function normalizeSubdomainSlug(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

export function validateSubdomainFormat(raw: string): { ok: true; slug: string } | { ok: false; error: string } {
  const slug = normalizeSubdomainSlug(raw);
  if (!slug) {
    return { ok: false, error: 'El subdominio es obligatorio.' };
  }
  if (slug.length < 3) {
    return { ok: false, error: 'El subdominio debe tener al menos 3 caracteres.' };
  }
  if (slug.length > 63) {
    return { ok: false, error: 'El subdominio no puede tener más de 63 caracteres.' };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      ok: false,
      error: 'El subdominio solo puede contener letras minúsculas, números y guiones.',
    };
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { ok: false, error: 'El subdominio no puede empezar ni terminar con guión.' };
  }
  if (RESERVED_SUBDOMAINS.has(slug)) {
    return { ok: false, error: 'Ese subdominio está reservado por la plataforma.' };
  }
  return { ok: true, slug };
}

export function membershipIncludesSubdomain(features: Record<string, unknown> | undefined): boolean {
  return features?.customSubdomain === true;
}

export async function isSubdomainSlugAvailable(
  db: Firestore,
  slug: string,
  excludeTenantId?: string
): Promise<boolean> {
  const normalized = normalizeSubdomainSlug(slug);
  if (!normalized) return false;

  const [activeSnap, pendingSnap] = await Promise.all([
    db.collection('tenants').where('subdomain', '==', normalized).get(),
    db.collection('tenants').where('pendingSubdomain', '==', normalized).get(),
  ]);

  const taken = [...activeSnap.docs, ...pendingSnap.docs].some(
    (doc) => !excludeTenantId || doc.id !== excludeTenantId
  );
  return !taken;
}

export function buildSubdomainPublicUrl(slug: string): string {
  const domain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'autodealers.com').replace(/^\./, '');
  return `https://${normalizeSubdomainSlug(slug)}.${domain}`;
}

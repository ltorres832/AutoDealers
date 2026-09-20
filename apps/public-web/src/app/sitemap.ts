import type { MetadataRoute } from 'next';
import { getFirestore } from '@/lib/firebase-admin';
import { isTenantEligibleForPublicCatalog } from '@/lib/public-catalog-visibility';
import {
  buildPublicSeoUrl,
  buildTenantSiteUrl,
  getPublicSeoBaseUrl,
  isReservedSubdomainSlug,
  PUBLIC_SITEMAP_STATIC_PATHS,
} from '@/lib/public-seo';

export const revalidate = 3600;

function staticSitemapEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_SITEMAP_STATIC_PATHS.map((path, index) => ({
    url: buildPublicSeoUrl(path === '/' ? '/' : path),
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : index < 4 ? 0.9 : 0.7,
  }));
}

async function tenantSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('tenants').get();
    const entries: MetadataRoute.Sitemap = [];
    const seen = new Set<string>();

    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (!isTenantEligibleForPublicCatalog(data, doc.id)) continue;

      const subdomain = String(data.subdomain ?? '')
        .trim()
        .toLowerCase();
      if (!subdomain || seen.has(subdomain) || isReservedSubdomainSlug(subdomain)) continue;

      seen.add(subdomain);
      const lastModified =
        typeof doc.updateTime?.toDate === 'function' ? doc.updateTime.toDate() : new Date();

      entries.push({
        url: buildPublicSeoUrl(`/${encodeURIComponent(subdomain)}`),
        lastModified,
        changeFrequency: 'daily',
        priority: 0.8,
      });

      const tenantHostUrl = buildTenantSiteUrl(subdomain);
      if (tenantHostUrl) {
        entries.push({
          url: tenantHostUrl,
          lastModified,
          changeFrequency: 'daily',
          priority: 0.75,
        });
      }
    }

    return entries;
  } catch (error) {
    console.warn('[sitemap] No se pudieron cargar tenants:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  getPublicSeoBaseUrl();
  const staticEntries = staticSitemapEntries();
  const tenantEntries = await tenantSitemapEntries();
  return [...staticEntries, ...tenantEntries];
}

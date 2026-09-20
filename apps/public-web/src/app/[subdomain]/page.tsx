import { notFound } from 'next/navigation';
import { getTenantBySubdomain } from '@/lib/firebase-admin';
import SellerPublicCatalogPage from '@/components/SellerPublicCatalogPage';
import { isReservedSubdomainSlug } from '@/lib/public-seo';
import TenantSubdomainClientPage from './TenantSubdomainClientPage';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ subdomain: string }>;
};

function normalizeSubdomain(raw: string | undefined): string {
  return (raw || '').trim().toLowerCase();
}

function isTechnicalSubdomain(slug: string): boolean {
  return (
    !slug ||
    slug === '*' ||
    slug.includes('---') ||
    slug.includes('public-web-app') ||
    slug.startsWith('t-')
  );
}

function readSellerWorkspaceId(tenant: Record<string, unknown> | null): string {
  const sellerInfo = tenant?.sellerInfo as { id?: unknown } | undefined;
  if (sellerInfo && typeof sellerInfo.id === 'string' && sellerInfo.id.trim()) {
    return sellerInfo.id.trim();
  }

  const tenantType = String(tenant?.type ?? tenant?.tenantType ?? '').toLowerCase();
  const ownerId = tenant?.ownerId;
  if (tenantType === 'seller' && typeof ownerId === 'string') {
    return ownerId.trim();
  }

  return '';
}

/**
 * Ruta /{subdomain} (ej. /pedroortiz en Firebase o pedroortiz.autodealers.com).
 * Vendedores independientes: catálogo morado en servidor, sin cargar la UI de concesionario.
 */
export default async function SubdomainPage({ params }: PageProps) {
  const { subdomain: rawSubdomain } = await params;
  const subdomain = normalizeSubdomain(rawSubdomain);

  if (isTechnicalSubdomain(subdomain) || isReservedSubdomainSlug(subdomain)) {
    notFound();
  }

  const tenant = (await getTenantBySubdomain(subdomain)) as Record<string, unknown> | null;
  const sellerId = readSellerWorkspaceId(tenant);

  if (sellerId) {
    return <SellerPublicCatalogPage sellerId={sellerId} standaloneSellerSite />;
  }

  return <TenantSubdomainClientPage />;
}

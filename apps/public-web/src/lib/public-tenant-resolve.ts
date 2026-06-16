import { getTenantById, getTenantBySubdomain } from '@autodealers/core';

/** Resuelve segmento de URL (id de tenant o subdominio) al id real del documento tenant. */
export async function resolvePublicCatalogTenantId(
  raw: string | null | undefined
): Promise<string | null> {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  const byId = await getTenantById(t);
  if (byId) {
    const status = String((byId as { status?: string }).status || 'active').toLowerCase();
    if (!['inactive', 'suspended', 'deleted', 'disabled'].includes(status)) {
      return byId.id;
    }
  }
  const bySub = await getTenantBySubdomain(t);
  return bySub?.id ?? null;
}

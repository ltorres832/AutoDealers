import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

const RESERVED = new Set([
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

export function normalizeTenantSubdomainSlug(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

export function validateTenantSubdomainSlug(
  raw: string
): { ok: true; slug: string } | { ok: false; error: string } {
  const slug = normalizeTenantSubdomainSlug(raw);
  if (!slug) return { ok: false, error: 'Subdominio vacío' };
  if (slug.length < 3 || slug.length > 63) return { ok: false, error: 'Longitud de subdominio inválida' };
  if (!/^[a-z0-9-]+$/.test(slug) || slug.startsWith('-') || slug.endsWith('-')) {
    return { ok: false, error: 'Formato de subdominio inválido' };
  }
  if (RESERVED.has(slug)) return { ok: false, error: 'Subdominio reservado' };
  return { ok: true, slug };
}

export async function isTenantSubdomainSlugAvailable(
  slug: string,
  excludeTenantId?: string
): Promise<boolean> {
  const db = getFirestore();
  const normalized = normalizeTenantSubdomainSlug(slug);
  const [activeSnap, pendingSnap] = await Promise.all([
    db.collection('tenants').where('subdomain', '==', normalized).get(),
    db.collection('tenants').where('pendingSubdomain', '==', normalized).get(),
  ]);
  return ![...activeSnap.docs, ...pendingSnap.docs].some(
    (doc) => !excludeTenantId || doc.id !== excludeTenantId
  );
}

/**
 * Activa o descarta el subdominio pendiente según la membresía pagada.
 */
export async function applyPendingSubdomainForMembership(
  tenantId: string,
  membershipId: string
): Promise<{ activated: boolean; subdomain?: string }> {
  const db = getFirestore();
  const [tenantDoc, membershipDoc] = await Promise.all([
    db.collection('tenants').doc(tenantId).get(),
    db.collection('memberships').doc(membershipId).get(),
  ]);
  if (!tenantDoc.exists) return { activated: false };

  const pendingRaw = String(tenantDoc.data()?.pendingSubdomain || '').trim();
  const membership = membershipDoc.data();
  const allows = membership?.features?.customSubdomain === true;

  const updates: Record<string, unknown> = {
    pendingSubdomain: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!allows || !pendingRaw) {
    updates.subdomain = null;
    await db.collection('tenants').doc(tenantId).update(updates);
    return { activated: false };
  }

  const format = validateTenantSubdomainSlug(pendingRaw);
  if (!format.ok) {
    updates.subdomain = null;
    await db.collection('tenants').doc(tenantId).update(updates);
    return { activated: false };
  }

  const available = await isTenantSubdomainSlugAvailable(format.slug, tenantId);
  if (!available) {
    updates.subdomain = null;
    await db.collection('tenants').doc(tenantId).update(updates);
    return { activated: false };
  }

  updates.subdomain = format.slug;
  await db.collection('tenants').doc(tenantId).update(updates);
  return { activated: true, subdomain: format.slug };
}

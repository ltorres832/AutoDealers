import { getFirestore } from '@autodealers/core';
import { queryMembershipsFromFirestore } from '@/lib/query-memberships-firestore';

export type AdminMembershipRow = {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  isActive: boolean;
  stripePriceId?: string;
  tenantCount?: number;
  features?: Record<string, unknown>;
};

/** Carga membresías en el servidor (Admin SDK). */
export async function loadAdminMembershipsList(): Promise<{
  memberships: AdminMembershipRow[];
  error: string | null;
}> {
  try {
    const db = getFirestore();
    const catalog = await queryMembershipsFromFirestore();
    const memberships = await Promise.all(
      catalog.map(async (m) => {
        const id = String(m.id);
        try {
          const tenantsSnap = await db
            .collection('tenants')
            .where('membershipId', '==', id)
            .get();
          return {
            id,
            name: String(m.name ?? ''),
            type: (m.type === 'seller' ? 'seller' : 'dealer') as 'dealer' | 'seller',
            price: Number(m.price) || 0,
            currency: String(m.currency ?? 'USD'),
            billingCycle: (m.billingCycle === 'yearly' ? 'yearly' : 'monthly') as
              | 'monthly'
              | 'yearly',
            isActive: m.isActive !== false,
            stripePriceId:
              typeof m.stripePriceId === 'string' ? m.stripePriceId : undefined,
            features:
              m.features && typeof m.features === 'object'
                ? (m.features as Record<string, unknown>)
                : undefined,
            tenantCount: tenantsSnap.size,
          };
        } catch {
          return {
            id,
            name: String(m.name ?? ''),
            type: (m.type === 'seller' ? 'seller' : 'dealer') as 'dealer' | 'seller',
            price: Number(m.price) || 0,
            currency: String(m.currency ?? 'USD'),
            billingCycle: (m.billingCycle === 'yearly' ? 'yearly' : 'monthly') as
              | 'monthly'
              | 'yearly',
            isActive: m.isActive !== false,
            tenantCount: 0,
          };
        }
      })
    );
    return { memberships, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al cargar membresías';
    console.error('[loadAdminMembershipsList]', err);
    return { memberships: [], error: message };
  }
}

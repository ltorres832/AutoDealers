/**
 * Agrega actividad de vendedores vinculados al dealer para monitoreo (solo lectura).
 * Excluye WhatsApp/mensajes.
 */
import { getFirestore, getScheduledPosts, getCampaigns, getPromotions } from '@autodealers/core';

export type NetworkActivityKind =
  | 'leads'
  | 'sales'
  | 'appointments'
  | 'campaigns'
  | 'promotions'
  | 'social'
  | 'sellers';

export type LinkedSeller = {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  status?: string;
};

export type OwnedItem = Record<string, unknown> & {
  id: string;
  ownerType: 'seller';
  ownerId: string;
  ownerName: string;
  sellerTenantId: string;
};

const WHATSAPP = 'whatsapp';

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function stripWhatsAppPlatforms(platforms: unknown): string[] {
  if (!Array.isArray(platforms)) return [];
  return platforms
    .map((p) => String(p).toLowerCase())
    .filter((p) => p && p !== WHATSAPP);
}

function withoutWhatsAppOnlyCampaign(item: Record<string, unknown>): boolean {
  const platforms = stripWhatsAppPlatforms(item.platforms);
  const channels = stripWhatsAppPlatforms(item.channels);
  if (platforms.length === 0 && channels.length === 0) {
    // Sin plataformas listadas: conservar (puede ser email/otro)
    return true;
  }
  return platforms.length > 0 || channels.length > 0;
}

export async function listLinkedSellers(
  dealerTenantId: string,
  opts?: { dealerIds?: string[]; userId?: string }
): Promise<LinkedSeller[]> {
  const db = getFirestore();
  const dealerIds = [...new Set(opts?.dealerIds?.length ? opts.dealerIds : [dealerTenantId])];

  if (!opts?.dealerIds?.length && opts?.userId) {
    const userDoc = await db.collection('users').doc(opts.userId).get();
    const associated = (userDoc.data()?.associatedDealers || []) as string[];
    for (const id of associated) {
      if (id && !dealerIds.includes(id)) dealerIds.push(id);
    }
  }

  const snaps = await Promise.all(
    dealerIds.map((dealerId) =>
      db.collection('users').where('role', '==', 'seller').where('dealerId', '==', dealerId).get()
    )
  );

  const map = new Map<string, LinkedSeller>();
  for (const snap of snaps) {
    for (const doc of snap.docs) {
      if (map.has(doc.id)) continue;
      const data = doc.data();
      map.set(doc.id, {
        id: doc.id,
        name: data.name || data.email || 'Sin nombre',
        email: data.email || '',
        tenantId: data.tenantId || dealerTenantId,
        status: data.status || 'active',
      });
    }
  }

  // También sub-users en el mismo tenant del dealer sin dealerId set
  try {
    const sameTenant = await db
      .collection('users')
      .where('role', '==', 'seller')
      .where('tenantId', '==', dealerTenantId)
      .get();
    for (const doc of sameTenant.docs) {
      if (map.has(doc.id)) continue;
      const data = doc.data();
      // Solo si no tienen otro dealer, o son del dealer
      if (data.dealerId && data.dealerId !== dealerTenantId) continue;
      map.set(doc.id, {
        id: doc.id,
        name: data.name || data.email || 'Sin nombre',
        email: data.email || '',
        tenantId: data.tenantId || dealerTenantId,
        status: data.status || 'active',
      });
    }
  } catch {
    // ignore index issues
  }

  return Array.from(map.values());
}

async function safeQuery(fn: () => Promise<{ docs: Array<{ id: string; data: () => any }> }>) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function loadSellerLeads(
  sellerTenantId: string,
  sellerId: string,
  limit: number
): Promise<OwnedItem[]> {
  const db = getFirestore();
  const col = db.collection('tenants').doc(sellerTenantId).collection('leads');
  const byAssigned = await safeQuery(() => col.where('assignedTo', '==', sellerId).limit(limit).get());
  const items = new Map<string, OwnedItem>();
  for (const doc of byAssigned?.docs || []) {
    const data = doc.data();
    items.set(doc.id, {
      id: doc.id,
      ...data,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
      ownerType: 'seller',
      ownerId: sellerId,
      ownerName: '',
      sellerTenantId,
    });
  }
  // sellerOwned marcados para este seller
  try {
    const ownedSnap = await col.where('sellerOwned', '==', true).limit(80).get();
    for (const doc of ownedSnap.docs) {
      const data = doc.data();
      if (data.assignedTo && data.assignedTo !== sellerId) continue;
      if (!items.has(doc.id)) {
        items.set(doc.id, {
          id: doc.id,
          ...data,
          createdAt: toIso(data.createdAt),
          updatedAt: toIso(data.updatedAt),
          ownerType: 'seller',
          ownerId: sellerId,
          ownerName: '',
          sellerTenantId,
        });
      }
    }
  } catch {
    // ignore
  }
  return Array.from(items.values()).slice(0, limit);
}

async function loadSellerSales(
  sellerTenantId: string,
  sellerId: string,
  limit: number
): Promise<OwnedItem[]> {
  const db = getFirestore();
  const col = db.collection('tenants').doc(sellerTenantId).collection('sales');
  let snap = await safeQuery(() =>
    col.where('sellerId', '==', sellerId).orderBy('createdAt', 'desc').limit(limit).get()
  );
  if (!snap) {
    snap = await safeQuery(() => col.where('sellerId', '==', sellerId).limit(limit).get());
  }
  return (snap?.docs || []).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: toIso(data.createdAt),
      salePrice: data.salePrice ?? data.total ?? data.price ?? 0,
      ownerType: 'seller' as const,
      ownerId: sellerId,
      ownerName: '',
      sellerTenantId,
    };
  });
}

async function loadSellerAppointments(
  sellerTenantId: string,
  sellerId: string,
  limit: number
): Promise<OwnedItem[]> {
  const db = getFirestore();
  const col = db.collection('tenants').doc(sellerTenantId).collection('appointments');
  let snap = await safeQuery(() => col.where('assignedTo', '==', sellerId).limit(limit).get());
  if (!snap || snap.docs.length === 0) {
    snap = await safeQuery(() => col.where('sellerId', '==', sellerId).limit(limit).get());
  }
  return (snap?.docs || []).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: toIso(data.date) || toIso(data.scheduledAt),
      scheduledAt: toIso(data.scheduledAt),
      ownerType: 'seller' as const,
      ownerId: sellerId,
      ownerName: '',
      sellerTenantId,
    };
  });
}

function mapCampaign(c: any, sellerId: string, sellerTenantId: string): OwnedItem | null {
  const platforms = stripWhatsAppPlatforms(c.platforms);
  if (Array.isArray(c.platforms) && c.platforms.length > 0 && platforms.length === 0) {
    return null; // solo whatsapp
  }
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    type: c.type,
    platforms,
    startDate: toIso(c.startDate) || c.startDate,
    endDate: toIso(c.endDate) || c.endDate,
    createdAt: toIso(c.createdAt) || c.createdAt,
    createdBy: c.createdBy,
    ownerType: 'seller',
    ownerId: sellerId,
    ownerName: '',
    sellerTenantId,
  };
}

function mapPromotion(p: any, sellerId: string, sellerTenantId: string): OwnedItem | null {
  const channels = stripWhatsAppPlatforms(p.channels || p.platforms);
  if (
    (Array.isArray(p.channels) && p.channels.length > 0 && channels.length === 0) ||
    (Array.isArray(p.platforms) && p.platforms.length > 0 && channels.length === 0)
  ) {
    // if only whatsapp, skip
    const raw = [...(p.channels || []), ...(p.platforms || [])].map((x: string) =>
      String(x).toLowerCase()
    );
    if (raw.length > 0 && raw.every((x) => x === WHATSAPP)) return null;
  }
  return {
    id: p.id,
    name: p.name || p.title,
    status: p.status,
    channels,
    startDate: toIso(p.startDate) || p.startDate,
    endDate: toIso(p.endDate) || p.endDate,
    createdAt: toIso(p.createdAt) || p.createdAt,
    createdBy: (p as { createdBy?: string }).createdBy,
    ownerType: 'seller',
    ownerId: sellerId,
    ownerName: '',
    sellerTenantId,
  };
}

function mapSocial(post: any, sellerId: string, sellerTenantId: string): OwnedItem {
  const platforms = stripWhatsAppPlatforms(post.platforms);
  return {
    id: post.id,
    content: post.content,
    platforms,
    status: post.status,
    scheduledFor: toIso(post.scheduledFor) || post.scheduledFor,
    publishedAt: toIso(post.publishedAt) || post.publishedAt,
    createdAt: toIso(post.createdAt) || post.createdAt,
    userId: post.userId,
    ownerType: 'seller',
    ownerId: sellerId,
    ownerName: '',
    sellerTenantId,
  };
}

export type NetworkActivityResult = {
  sellers: LinkedSeller[];
  leads: OwnedItem[];
  sales: OwnedItem[];
  appointments: OwnedItem[];
  campaigns: OwnedItem[];
  promotions: OwnedItem[];
  social: OwnedItem[];
  summaryBySeller: Array<{
    sellerId: string;
    sellerName: string;
    sellerEmail: string;
    tenantId: string;
    totalLeads: number;
    activeLeads: number;
    totalSales: number;
    totalRevenue: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalPromotions: number;
    totalSocialPosts: number;
    scheduledSocialPosts: number;
  }>;
};

export async function getSellerNetworkActivity(
  dealerTenantId: string,
  opts?: {
    userId?: string;
    dealerIds?: string[];
    kinds?: NetworkActivityKind[];
    limitPerSeller?: number;
    sellerId?: string;
  }
): Promise<NetworkActivityResult> {
  const kinds = new Set(
    opts?.kinds?.length
      ? opts.kinds
      : (['leads', 'sales', 'appointments', 'campaigns', 'promotions', 'social', 'sellers'] as NetworkActivityKind[])
  );
  const limit = opts?.limitPerSeller ?? 25;

  let sellers = await listLinkedSellers(dealerTenantId, {
    dealerIds: opts?.dealerIds,
    userId: opts?.userId,
  });
  if (opts?.sellerId) {
    sellers = sellers.filter((s) => s.id === opts.sellerId);
  }

  const empty: NetworkActivityResult = {
    sellers,
    leads: [],
    sales: [],
    appointments: [],
    campaigns: [],
    promotions: [],
    social: [],
    summaryBySeller: [],
  };

  if (sellers.length === 0) return empty;

  const perSeller = await Promise.all(
    sellers.map(async (seller) => {
      const sellerTenantId = seller.tenantId || dealerTenantId;
      const [leads, sales, appointments, allCampaigns, allPromotions, scheduled] = await Promise.all([
        kinds.has('leads') ? loadSellerLeads(sellerTenantId, seller.id, limit) : Promise.resolve([]),
        kinds.has('sales') ? loadSellerSales(sellerTenantId, seller.id, limit) : Promise.resolve([]),
        kinds.has('appointments')
          ? loadSellerAppointments(sellerTenantId, seller.id, limit)
          : Promise.resolve([]),
        kinds.has('campaigns')
          ? getCampaigns(sellerTenantId).catch(() => [])
          : Promise.resolve([]),
        kinds.has('promotions')
          ? getPromotions(sellerTenantId).catch(() => [])
          : Promise.resolve([]),
        kinds.has('social')
          ? getScheduledPosts(sellerTenantId, seller.id).catch(() => [])
          : Promise.resolve([]),
      ]);

      const campaigns = (allCampaigns as any[])
        .filter((c) => c.createdBy === seller.id)
        .map((c) => mapCampaign(c, seller.id, sellerTenantId))
        .filter(Boolean)
        .slice(0, limit) as OwnedItem[];

      const promotions = (allPromotions as any[])
        .filter((p) => (p as { createdBy?: string }).createdBy === seller.id)
        .map((p) => mapPromotion(p, seller.id, sellerTenantId))
        .filter(Boolean)
        .slice(0, limit) as OwnedItem[];

      const social = (scheduled as any[])
        .slice(0, limit)
        .map((p) => mapSocial(p, seller.id, sellerTenantId))
        .filter((p) => (p.platforms as string[]).length > 0 || true);

      const stamp = <T extends OwnedItem>(items: T[]) =>
        items.map((i) => ({ ...i, ownerName: seller.name, ownerId: seller.id }));

      const stampedLeads = stamp(leads);
      const stampedSales = stamp(sales);
      const stampedAppts = stamp(appointments);
      const stampedCampaigns = stamp(campaigns);
      const stampedPromos = stamp(promotions);
      const stampedSocial = stamp(social);

      const activeLeads = stampedLeads.filter(
        (l) => !['closed', 'lost', 'converted'].includes(String(l.status || ''))
      ).length;
      const totalRevenue = stampedSales.reduce(
        (sum, s) => sum + Number(s.salePrice || s.total || s.price || 0),
        0
      );
      const activeCampaigns = stampedCampaigns.filter((c) =>
        ['active', 'scheduled', 'running'].includes(String(c.status || ''))
      ).length;
      const scheduledSocial = stampedSocial.filter((p) => p.status === 'scheduled').length;

      return {
        seller,
        leads: stampedLeads,
        sales: stampedSales,
        appointments: stampedAppts,
        campaigns: stampedCampaigns,
        promotions: stampedPromos,
        social: stampedSocial,
        summary: {
          sellerId: seller.id,
          sellerName: seller.name,
          sellerEmail: seller.email,
          tenantId: sellerTenantId,
          totalLeads: stampedLeads.length,
          activeLeads,
          totalSales: stampedSales.length,
          totalRevenue,
          totalCampaigns: stampedCampaigns.length,
          activeCampaigns,
          totalPromotions: stampedPromos.length,
          totalSocialPosts: stampedSocial.length,
          scheduledSocialPosts: scheduledSocial,
        },
      };
    })
  );

  return {
    sellers,
    leads: perSeller.flatMap((p) => p.leads),
    sales: perSeller.flatMap((p) => p.sales),
    appointments: perSeller.flatMap((p) => p.appointments),
    campaigns: perSeller.flatMap((p) => p.campaigns),
    promotions: perSeller.flatMap((p) => p.promotions),
    social: perSeller.flatMap((p) => p.social),
    summaryBySeller: perSeller.map((p) => p.summary),
  };
}

export { stripWhatsAppPlatforms, withoutWhatsAppOnlyCampaign };

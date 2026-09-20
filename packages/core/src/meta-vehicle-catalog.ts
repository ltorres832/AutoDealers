/**
 * Catálogo de vehículos de Meta (Commerce, vertical "vehicles") para
 * Automotive Inventory Ads (anuncios dinámicos de inventario en FB/IG).
 *
 * Flujo:
 * 1. `ensureTenantVehicleCatalog` crea (una sola vez) el catálogo en el
 *    Business Manager del dealer y registra un "scheduled feed": Meta
 *    descarga cada hora el CSV que sirve public-web
 *    (`/api/feeds/meta-vehicles/{tenantId}?token=...`).
 * 2. `requestVehicleFeedSync` fuerza una descarga inmediata del feed.
 * 3. `createVehicleCatalogCampaign` crea campaña + ad set + creative dinámico
 *    + ad apuntando al product set del catálogo (Marketing API).
 *
 * La config se persiste en `tenants/{tenantId}/integrations` (doc de
 * facebook) bajo `credentials.vehicleCatalog`.
 */

import { getFirestore, getFirestoreFieldValue } from '@autodealers/shared';
import { buildPublicWebUrl } from '@autodealers/shared/platform-urls';
import { randomBytes } from 'crypto';

const GRAPH_BASE = 'https://graph.facebook.com/v18.0';

export interface MetaVehicleCatalogConfig {
  businessId: string;
  catalogId: string;
  feedId: string;
  productSetId: string;
  /** Token secreto por tenant que protege el feed público. */
  feedToken: string;
  feedUrl: string;
  enabledAt?: unknown;
  lastSyncRequestAt?: unknown;
}

export interface MetaVehicleCatalogStatus {
  enabled: boolean;
  facebookConnected: boolean;
  /** El token tiene catalog_management (si es false, hay que reconectar Meta). */
  catalogScopeGranted?: boolean;
  /** El token ve al menos un Business Manager. */
  hasBusinessManager?: boolean;
  config?: Pick<MetaVehicleCatalogConfig, 'businessId' | 'catalogId' | 'feedId' | 'productSetId' | 'feedUrl'>;
  productCount?: number;
  latestUpload?: { startTime?: string; endTime?: string; errorCount?: number; warningCount?: number };
  error?: string;
}

function readCatalogReadiness(credentials: Record<string, unknown>): {
  catalogScopeGranted?: boolean;
  hasBusinessManager?: boolean;
} {
  const scopes = Array.isArray(credentials.scopesGranted)
    ? (credentials.scopesGranted as unknown[]).map((s) => String(s).toLowerCase())
    : null;
  const health = credentials.metaTokenHealth as
    | { businessesOk?: boolean; readyForCatalog?: boolean }
    | undefined;
  const cfg = credentials.vehicleCatalog as { businessId?: string } | undefined;
  return {
    catalogScopeGranted: scopes ? scopes.includes('catalog_management') : undefined,
    hasBusinessManager:
      health?.businessesOk === true || !!cfg?.businessId
        ? true
        : health?.businessesOk === false
          ? false
          : undefined,
  };
}

interface GraphResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function graphFetch<T = Record<string, unknown>>(
  path: string,
  accessToken: string,
  init?: { method?: 'GET' | 'POST' | 'DELETE'; body?: Record<string, unknown> }
): Promise<GraphResult<T>> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
    });
    const data = (await res.json()) as T & { error?: { message?: string } };
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `Meta API ${res.status}` };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de red con Meta' };
  }
}

async function getFacebookIntegrationDoc(tenantId: string) {
  const db = getFirestore();
  const snap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .where('type', '==', 'facebook')
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const credentials = (doc.data().credentials || {}) as Record<string, unknown>;
  return { ref: doc.ref, credentials };
}

export async function getMetaVehicleCatalogConfig(
  tenantId: string
): Promise<{ facebookConnected: boolean; config: MetaVehicleCatalogConfig | null }> {
  const integration = await getFacebookIntegrationDoc(tenantId);
  if (!integration) return { facebookConnected: false, config: null };
  const raw = integration.credentials.vehicleCatalog as MetaVehicleCatalogConfig | undefined;
  if (!raw || !raw.catalogId || !raw.feedToken) {
    return { facebookConnected: true, config: null };
  }
  return { facebookConnected: true, config: raw };
}

/** Valida el token del feed público sin exponer credenciales. */
export async function verifyVehicleFeedToken(
  tenantId: string,
  token: string
): Promise<boolean> {
  if (!token || !token.trim()) return false;
  const db = getFirestore();
  // El feed debe seguir sirviéndose aunque la integración se marque inactiva
  // temporalmente (Meta reintenta); solo exigimos que exista el doc con token.
  const snap = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('integrations')
    .where('type', '==', 'facebook')
    .limit(1)
    .get();
  if (snap.empty) return false;
  const creds = (snap.docs[0].data().credentials || {}) as Record<string, unknown>;
  const cfg = creds.vehicleCatalog as MetaVehicleCatalogConfig | undefined;
  return !!cfg?.feedToken && cfg.feedToken === token.trim();
}

/**
 * Crea (idempotente) business → catálogo → feed programado → product set,
 * y persiste la config en las credenciales de la integración de Facebook.
 */
export async function ensureTenantVehicleCatalog(params: {
  tenantId: string;
  tenantName: string;
}): Promise<{ success: boolean; config?: MetaVehicleCatalogConfig; error?: string }> {
  const { tenantId, tenantName } = params;
  const integration = await getFacebookIntegrationDoc(tenantId);
  if (!integration) {
    return { success: false, error: 'Facebook no está conectado. Conecta Meta primero.' };
  }
  const accessToken = String(integration.credentials.accessToken || '').trim();
  if (!accessToken) {
    return { success: false, error: 'Sin token de usuario de Meta. Reconecta Facebook.' };
  }

  const readiness = readCatalogReadiness(integration.credentials);
  if (readiness.catalogScopeGranted === false) {
    return {
      success: false,
      error:
        'Tu conexión con Meta no incluye el permiso catalog_management. Usa «Actualizar permisos de Facebook» en la tarjeta de Meta y acepta todos los permisos.',
    };
  }

  const existing = integration.credentials.vehicleCatalog as
    | Partial<MetaVehicleCatalogConfig>
    | undefined;

  // 1. Business Manager
  let businessId = String(existing?.businessId || '').trim();
  if (!businessId) {
    const biz = await graphFetch<{ data?: Array<{ id: string; name?: string }> }>(
      'me/businesses?fields=id,name&limit=5',
      accessToken
    );
    if (!biz.ok) return { success: false, error: `No se pudo leer tu Business Manager: ${biz.error}` };
    businessId = biz.data?.data?.[0]?.id || '';
    if (!businessId) {
      return {
        success: false,
        error:
          'Tu cuenta de Meta no tiene un Business Manager. Crea uno en business.facebook.com y reconecta (permiso business_management).',
      };
    }
  }

  // 2. Token del feed + URL pública
  const feedToken = String(existing?.feedToken || '').trim() || randomBytes(24).toString('hex');
  const feedUrl = buildPublicWebUrl(
    `/api/feeds/meta-vehicles/${encodeURIComponent(tenantId)}?token=${feedToken}`
  );

  // 3. Catálogo (vertical vehicles)
  let catalogId = String(existing?.catalogId || '').trim();
  if (!catalogId) {
    const created = await graphFetch<{ id?: string }>(
      `${businessId}/owned_product_catalogs`,
      accessToken,
      {
        method: 'POST',
        body: { name: `Vehículos - ${tenantName}`.slice(0, 100), vertical: 'vehicles' },
      }
    );
    if (!created.ok) {
      return { success: false, error: `No se pudo crear el catálogo: ${created.error}` };
    }
    catalogId = String(created.data?.id || '');
    if (!catalogId) return { success: false, error: 'Meta no devolvió el ID del catálogo' };
  }

  // 4. Feed programado (Meta lo descarga cada hora)
  let feedId = String(existing?.feedId || '').trim();
  if (!feedId) {
    const feed = await graphFetch<{ id?: string }>(`${catalogId}/product_feeds`, accessToken, {
      method: 'POST',
      body: {
        name: `Inventario ${tenantName}`.slice(0, 100),
        schedule: { interval: 'HOURLY', url: feedUrl },
      },
    });
    if (!feed.ok) return { success: false, error: `No se pudo registrar el feed: ${feed.error}` };
    feedId = String(feed.data?.id || '');
    if (!feedId) return { success: false, error: 'Meta no devolvió el ID del feed' };
  }

  // 5. Product set "todos" (lo usan las campañas dinámicas)
  let productSetId = String(existing?.productSetId || '').trim();
  if (!productSetId) {
    const set = await graphFetch<{ id?: string }>(`${catalogId}/product_sets`, accessToken, {
      method: 'POST',
      body: {
        name: 'Todos los vehículos',
        filter: { retailer_id: { i_contains: '' } },
      },
    });
    if (!set.ok) return { success: false, error: `No se pudo crear el product set: ${set.error}` };
    productSetId = String(set.data?.id || '');
  }

  const config: MetaVehicleCatalogConfig = {
    businessId,
    catalogId,
    feedId,
    productSetId,
    feedToken,
    feedUrl,
    enabledAt: existing?.enabledAt ?? new Date().toISOString(),
  };

  await integration.ref.update({
    credentials: { ...integration.credentials, vehicleCatalog: config },
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });

  return { success: true, config };
}

/** Fuerza una descarga inmediata del feed programado. */
export async function requestVehicleFeedSync(
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const integration = await getFacebookIntegrationDoc(tenantId);
  if (!integration) return { success: false, error: 'Facebook no está conectado' };
  const accessToken = String(integration.credentials.accessToken || '').trim();
  const cfg = integration.credentials.vehicleCatalog as MetaVehicleCatalogConfig | undefined;
  if (!accessToken || !cfg?.feedId) {
    return { success: false, error: 'El catálogo de vehículos no está activado' };
  }
  const res = await graphFetch<{ id?: string }>(`${cfg.feedId}/uploads`, accessToken, {
    method: 'POST',
    body: {},
  });
  if (!res.ok) return { success: false, error: res.error };
  await integration.ref.update({
    credentials: {
      ...integration.credentials,
      vehicleCatalog: { ...cfg, lastSyncRequestAt: new Date().toISOString() },
    },
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return { success: true };
}

/** Estado del catálogo/feed para la UI del dealer. */
export async function getVehicleCatalogStatus(
  tenantId: string
): Promise<MetaVehicleCatalogStatus> {
  const integrationForReadiness = await getFacebookIntegrationDoc(tenantId);
  if (!integrationForReadiness) return { enabled: false, facebookConnected: false };
  const readiness = readCatalogReadiness(integrationForReadiness.credentials);
  const config = (integrationForReadiness.credentials.vehicleCatalog ||
    null) as MetaVehicleCatalogConfig | null;
  if (!config?.catalogId || !config.feedToken) {
    return { enabled: false, facebookConnected: true, ...readiness };
  }

  const base: MetaVehicleCatalogStatus = {
    enabled: true,
    facebookConnected: true,
    ...readiness,
    config: {
      businessId: config.businessId,
      catalogId: config.catalogId,
      feedId: config.feedId,
      productSetId: config.productSetId,
      feedUrl: config.feedUrl,
    },
  };

  const accessToken = String(integrationForReadiness.credentials.accessToken || '').trim();
  if (!accessToken) return base;

  const catalog = await graphFetch<{ product_count?: number }>(
    `${config.catalogId}?fields=product_count`,
    accessToken
  );
  if (catalog.ok) base.productCount = catalog.data?.product_count;

  const feed = await graphFetch<{
    latest_upload?: { start_time?: string; end_time?: string; error_count?: number; warning_count?: number };
  }>(`${config.feedId}?fields=latest_upload{start_time,end_time,error_count,warning_count}`, accessToken);
  const latestUpload = feed.ok ? feed.data?.latest_upload : undefined;
  if (latestUpload) {
    base.latestUpload = {
      startTime: latestUpload.start_time,
      endTime: latestUpload.end_time,
      errorCount: latestUpload.error_count,
      warningCount: latestUpload.warning_count,
    };
  }
  if (!catalog.ok) base.error = catalog.error;
  return base;
}

/** Desactiva el catálogo para el tenant (no borra el catálogo en Meta). */
export async function disableTenantVehicleCatalog(
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const integration = await getFacebookIntegrationDoc(tenantId);
  if (!integration) return { success: false, error: 'Facebook no está conectado' };
  const creds = { ...integration.credentials };
  delete creds.vehicleCatalog;
  await integration.ref.update({
    credentials: creds,
    updatedAt: getFirestoreFieldValue().serverTimestamp(),
  });
  return { success: true };
}

/**
 * Crea una campaña dinámica de inventario (AIA): campaign → ad set →
 * creative con plantilla dinámica → ad. Se crea PAUSADA salvo `activate`.
 */
export async function createVehicleCatalogCampaign(params: {
  tenantId: string;
  userId: string;
  name: string;
  dailyBudget: number;
  durationDays: number;
  countries?: string[];
  linkUrl: string;
  activate?: boolean;
}): Promise<{
  success: boolean;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  error?: string;
}> {
  const { tenantId, userId, name, dailyBudget, durationDays, linkUrl } = params;
  const countries = params.countries?.length ? params.countries : ['US'];
  const status = params.activate ? 'ACTIVE' : 'PAUSED';

  const integration = await getFacebookIntegrationDoc(tenantId);
  if (!integration) return { success: false, error: 'Facebook no está conectado' };
  const creds = integration.credentials;
  const accessToken = String(creds.accessToken || '').trim();
  const adAccountRaw = String(creds.adAccountId || '').trim();
  const pageId = String(creds.pageId || '').trim();
  const cfg = creds.vehicleCatalog as MetaVehicleCatalogConfig | undefined;

  if (!accessToken || !adAccountRaw) {
    return { success: false, error: 'Cuenta publicitaria no configurada. Verifica permisos de Meta.' };
  }
  if (!pageId) return { success: false, error: 'Sin página de Facebook vinculada' };
  if (!cfg?.catalogId || !cfg.productSetId) {
    return { success: false, error: 'Activa primero el catálogo de vehículos' };
  }
  const adAccountId = adAccountRaw.startsWith('act_') ? adAccountRaw : `act_${adAccountRaw}`;

  // 1. Campaña
  const campaign = await graphFetch<{ id?: string }>(`${adAccountId}/campaigns`, accessToken, {
    method: 'POST',
    body: {
      name,
      objective: 'OUTCOME_SALES',
      special_ad_categories: [],
      status,
    },
  });
  if (!campaign.ok) return { success: false, error: `Campaña: ${campaign.error}` };
  const campaignId = String(campaign.data?.id || '');

  // 2. Ad set con el product set del catálogo
  const endTime = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  const adSet = await graphFetch<{ id?: string }>(`${adAccountId}/adsets`, accessToken, {
    method: 'POST',
    body: {
      name: `${name} - Inventario`,
      campaign_id: campaignId,
      daily_budget: Math.round(dailyBudget * 100),
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      promoted_object: { product_set_id: cfg.productSetId },
      targeting: {
        age_min: 18,
        geo_locations: { countries },
      },
      end_time: endTime.toISOString(),
      status,
    },
  });
  if (!adSet.ok) return { success: false, error: `Ad set: ${adSet.error}` };
  const adSetId = String(adSet.data?.id || '');

  // 3. Creative dinámico (Meta rellena por vehículo)
  const creative = await graphFetch<{ id?: string }>(`${adAccountId}/adcreatives`, accessToken, {
    method: 'POST',
    body: {
      name: `${name} - Creative`,
      product_set_id: cfg.productSetId,
      object_story_spec: {
        page_id: pageId,
        template_data: {
          message: '{{vehicle.year}} {{vehicle.make}} {{vehicle.model}} disponible ahora',
          name: '{{vehicle.year}} {{vehicle.make}} {{vehicle.model}}',
          description: '{{vehicle.price}}',
          link: linkUrl,
          call_to_action: { type: 'LEARN_MORE' },
        },
      },
    },
  });
  if (!creative.ok) return { success: false, error: `Creative: ${creative.error}` };
  const creativeId = String(creative.data?.id || '');

  // 4. Ad
  const ad = await graphFetch<{ id?: string }>(`${adAccountId}/ads`, accessToken, {
    method: 'POST',
    body: {
      name: `${name} - Ad`,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status,
    },
  });
  if (!ad.ok) return { success: false, error: `Ad: ${ad.error}` };
  const adId = String(ad.data?.id || '');

  // 5. Registrar en Firestore junto a las demás campañas
  const db = getFirestore();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('ad_campaigns')
    .doc()
    .set({
      tenantId,
      userId,
      name,
      objective: 'catalog_sales',
      kind: 'vehicle_catalog',
      budget: dailyBudget * durationDays,
      dailyBudget,
      duration: durationDays,
      platforms: ['facebook', 'instagram'],
      status: params.activate ? 'active' : 'draft',
      metaCampaignId: campaignId,
      adSetId,
      adId,
      spent: 0,
      impressions: 0,
      clicks: 0,
      messages: 0,
      visits: 0,
      createdAt: getFirestoreFieldValue().serverTimestamp(),
      ...(params.activate ? { startedAt: getFirestoreFieldValue().serverTimestamp() } : {}),
    });

  return { success: true, campaignId, adSetId, adId };
}
